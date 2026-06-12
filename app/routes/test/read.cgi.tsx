import { createRoute } from "honox/factory";

import { formatReadAuthorName } from "../../../src/conversation/domain/read/ReadAuthorName";
import { isSage } from "../../../src/conversation/domain/write/WriteMail";
import { getAllResponsesByThreadEpochIdUsecase } from "../../../src/conversation/usecases/getAllResponsesByThreadEpochIdUsecase";
import { getLatestResponsesByThreadIdAndCountUsecase } from "../../../src/conversation/usecases/getLatestResponsesByThreadIdAndCountUsecase";
import { getResponseByThreadIdAndResNumRangeUsecase } from "../../../src/conversation/usecases/getResponseByThreadIdAndResNumRangeUsecase";
import { getResponseByThreadIdAndResNumUsecase } from "../../../src/conversation/usecases/getResponseByThreadIdAndResNumUsecase";
import { getNormalConfigUsecase } from "../../../src/config/usecases/getNormalConfigUsecase";
import { postResponseByThreadIdUsecase } from "../../../src/conversation/usecases/postResponseByThreadIdUsecase";
import { getThreadIdByThreadEpochIdRepository } from "../../../src/conversation/repositories/getThreadIdByThreadEpochIdRepository";
import { createWriteThreadEpochId } from "../../../src/conversation/domain/write/WriteThreadEpochId";
import { formatDate } from "../../../src/shared/utils/formatDate";
import { generateSlip } from "../../../src/slip/services/slipService";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { logFailureUsecase } from "../../../src/failurelog/usecases/logFailureUsecase";
import { ErrorCodes } from "../../../src/error/completeErrorCodes";
import { getIpAddress } from "../../utils/getIpAddress";
import { getUserCookieData } from "../../utils/userCookieManager";
import { convertAll } from "../../../src/converter/contentConverterService";
import { parseReadOption } from "../../../src/converter/optionParserService";

import { ok as okResult } from "neverthrow";
import { getBoardByKeyRepository } from "../../../src/board/repositories/getBoardByKeyRepository";
import type { ReadThreadWithResponses } from "../../../src/conversation/domain/read/ReadThreadWithResponses";
import type { Result } from "neverthrow";

const RESMAX = 1000;

const sanitizeHtml = (html: string): string => {
  return html
    .replace(/javascript:/gi, "javascript-disabled:")
    .replace(/data:/gi, "data-disabled:")
    .replace(/vbscript:/gi, "vbscript-disabled:")
    .replace(/onclick/gi, "onclick-disabled")
    .replace(/onerror/gi, "onerror-disabled")
    .replace(/onload/gi, "onload-disabled")
    .replace(/onmouseover/gi, "onmouseover-disabled")
    .replace(/onfocus/gi, "onfocus-disabled")
    .replace(/onblur/gi, "onblur-disabled");
};

const expandIPv6 = (ip: string): string => {
  if (!ip.includes(":")) return ip;
  if (ip === "::1") return "0:0:0:0:0:0:0:1";
  const parts = ip.split("::");
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  const zeros = Array(missing).fill("0");
  return [...left, ...zeros, ...right].map(s => s.padStart(4, "0")).join(":");
};

const detectMobileProductId = (ua: string): string | null => {
  if (/DoCoMo\/2\.0/.test(ua)) return "docomo";
  if (/KDDI-/.test(ua) || /UP\.Browser/.test(ua)) return "au";
  if (/SoftBank/.test(ua) || /Vodafone/.test(ua)) return "softbank";
  if (/J-PHONE/.test(ua)) return "jpone";
  if (/emobile/.test(ua) || /EMOBILE/.test(ua)) return "emobile";
  if (/willcom/.test(ua) || /DDIPOCKET/.test(ua)) return "willcom";
  return null;
};

const parseOptions = (queryString: string): { type: string; count: number; start: number | null; end: number | null } => {
  if (queryString === "last" || queryString === "nofirst") {
    return { type: queryString, count: 0, start: null, end: null };
  }
  const parsed = parseReadOption(queryString);

  if (parsed.isSingle) {
    return { type: "single", count: parsed.start, start: null, end: null };
  }
  if (parsed.isLast) {
    return { type: "latest", count: parsed.start, start: null, end: null };
  }
  if (parsed.start !== -1 && parsed.end !== -1) {
    return { type: "range", count: 0, start: parsed.start, end: parsed.end === -1 ? null : parsed.end };
  }
  return { type: "all", count: 0, start: null, end: null };
};

const checkLimtime = (config: { limitmeEnabled: boolean; limitmeFrom: number; limitmeTo: number }): boolean => {
  if (!config.limitmeEnabled) return true;
  const now = new Date();
  const hour = now.getHours();
  const from = config.limitmeFrom;
  const to = config.limitmeTo;
  if (from <= to) {
    return hour < from || hour >= to;
  } else {
    return hour >= to && hour < from;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;
  const bbs = c.req.param("bbs");
  const key = c.req.param("key");

  if (!sql) {
    return new Response("DBに接続できませんでした", { status: 500 });
  }

  const rawBody = await c.req.arrayBuffer();
  const decoder = new TextDecoder("shift-jis");
  const decodedBody = decoder.decode(rawBody);
  const paramsMap = new Map<string, string>();
  for (const pair of decodedBody.split("&")) {
    const [k, v] = pair.split("=");
    paramsMap.set(k, v);
  }

  const name = paramsMap.get("FROM") ?? null;
  const mail = paramsMap.get("mail") ?? null;
  const content = paramsMap.get("MESSAGE");

  if (!content) {
    return new Response("名前と本文は必須です。", {
      headers: { "Content-Type": "text/plain; charset=Shift_JIS" },
    });
  }

  const ipAddressRaw = getIpAddress(c);
  const hostname = c.req.header("Host") ?? ipAddressRaw;
  const userAgent = c.req.header("User-Agent") ?? "";

  const threadEpochIdResult = createWriteThreadEpochId(key);
  if (threadEpochIdResult.isErr()) {
    logFailureUsecase({ sql, logger }, {
      errorCode: ErrorCodes.CGI_FORBIDDEN.code,
      errorMessage: threadEpochIdResult.error.message,
      name: name ?? "", mail: mail ?? "",
      content: typeof content === "string" ? content : "",
      ipAddress: ipAddressRaw, host: hostname, threadKey: key, userAgent,
    }).catch((err) => { console.error("Async operation failed:", err); });
    return new Response(`エラーが発生しました: ${threadEpochIdResult.error.message}`, {
      headers: { "Content-Type": "text/plain; charset=Shift_JIS" },
    });
  }

  const threadIdResult = await getThreadIdByThreadEpochIdRepository({ sql, logger }, { threadEpochId: threadEpochIdResult.value });
  if (threadIdResult.isErr()) {
    logFailureUsecase({ sql, logger }, {
      errorCode: ErrorCodes.THREAD_MOVED.code,
      errorMessage: threadIdResult.error.message,
      name: name ?? "", mail: mail ?? "",
      content: typeof content === "string" ? content : "",
      ipAddress: ipAddressRaw, host: hostname, threadKey: key, userAgent,
    }).catch((err) => { console.error("Async operation failed:", err); });
    return new Response(`エラーが発生しました: ${threadIdResult.error.message}`, {
      headers: { "Content-Type": "text/plain; charset=Shift_JIS" },
    });
  }

  const result = await postResponseByThreadIdUsecase({ sql, logger }, {
    threadIdRaw: threadIdResult.value.val,
    authorNameRaw: name, mailRaw: mail,
    responseContentRaw: content, ipAddressRaw,
    remoteHost: hostname, userAgent, browserFpRaw: null,
    passwordRaw: null, hasCapPermission: false,
  });

  if (result.isErr()) {
    logFailureUsecase({ sql, logger }, {
      errorCode: ErrorCodes.CGI_FORBIDDEN.code,
      errorMessage: result.error.message,
      name: name ?? "", mail: mail ?? "",
      content: typeof content === "string" ? content : "",
      ipAddress: ipAddressRaw, host: hostname, threadKey: key, userAgent,
    }).catch((err) => { console.error("Async operation failed:", err); });
    return new Response(`エラーが発生しました: ${result.error.message}`, {
      headers: { "Content-Type": "text/plain; charset=Shift_JIS" },
    });
  }

  addAdminLogUsecase({ sql, logger }, {
    action: "CGIレス作成(read.cgi)",
    detail: `スレッドID: ${result.value.threadId.val}, レス番号: ${result.value.responseNumber.val}`,
    ipAddress: ipAddressRaw, logType: "WRT",
  }).catch((err) => { console.error("Async operation failed:", err); });

  const location = `/test/read.cgi/${bbs}/${key}/l50`;
  const redirectBody = `<!DOCTYPE html><html lang="ja"><head><meta charset="Shift_JIS"><meta http-equiv="refresh" content="0;URL=${location}"></head><body>書きこみが終りました。<a href="${location}">戻る</a></body></html>`;
  const encoder = new TextEncoder();
  return new Response(encoder.encode(redirectBody), {
    headers: { "Content-Type": "text/html; charset=Shift_JIS" },
  });
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;
  const bbs = c.req.param("bbs") || "news";
  const key = c.req.param("key") || "";
  const queryString = c.req.param("options") || "";

  let boardId: string | undefined;
  const boardResult = await getBoardByKeyRepository({ sql, logger }, { boardKey: bbs });
  if (boardResult.isOk()) {
    boardId = boardResult.value.id;
  }

  logger.info({
    operation: "read.cgi/GET",
    bbs, key, options: queryString, boardId,
    message: "read.cgi page requested",
  });

  if (!sql) {
    c.status(500);
    return c.render(<div className="text-red-500">DB connection failed</div>);
  }

  const configResult = await getNormalConfigUsecase({ sql, logger });
  const config = configResult.isOk() ? configResult.value : null;
  const readType = config?.readType || "5ch";
  const linkColor = config?.linkColor || "#7c3aed";
  const nameColor = config?.nameColor || "#374151";
  const autoDiscover = config?.autoDiscoverThreads ?? true;

  if (!checkLimtime({
    limitmeEnabled: config?.limitmeEnabled ?? false,
    limitmeFrom: config?.limitmeFrom ?? 0,
    limitmeTo: config?.limitmeTo ?? 0,
  })) {
    c.status(403);
    return c.render(<div className="text-red-500">現在閲覧制限中です</div>);
  }

  const threadEpochIdResult = createWriteThreadEpochId(key);
  if (threadEpochIdResult.isErr()) {
    c.status(404);
    return c.render(<div className="text-red-500">スレッドが見つかりません</div>);
  }

  let threadId: string | null = null;
  const idResult = await getThreadIdByThreadEpochIdRepository({ sql, logger }, { threadEpochId: threadEpochIdResult.value });
  if (idResult.isOk()) {
    threadId = idResult.value.val;
  } else if (autoDiscover) {
    const discoverResult = await sql`
      SELECT id FROM threads WHERE id::text ILIKE ${`%${key}%`} LIMIT 1
    `;
    if (discoverResult && discoverResult.length > 0) {
      threadId = String(discoverResult[0].id);
    }
  }

  if (!threadId) {
    if (autoDiscover) {
      const mainThreads = await sql<{ id: string; title: string; epoch_id: number; updated_at: Date }[]>`
        SELECT id, title, epoch_id, updated_at FROM threads WHERE TRUE ${boardId ? sql`AND board_id = ${boardId}::uuid` : sql``} AND title ILIKE ${`%${key}%`} ORDER BY updated_at DESC LIMIT 20
      `;
      const archivedThreads = await sql<{ id: string; title: string; epoch_id: number; updated_at: Date }[]>`
        SELECT id, title, epoch_id, updated_at FROM threads WHERE TRUE ${boardId ? sql`AND board_id = ${boardId}::uuid` : sql``} AND is_pooled = true AND title ILIKE ${`%${key}%`} ORDER BY updated_at DESC LIMIT 20
      `;
      const writeLogs = await sql<{ thread_id: string; response_number: number; hash_id: string; author_name: string; posted_at: Date }[]>`
        SELECT thread_id, response_number, hash_id, author_name, posted_at FROM write_logs WHERE hash_id ILIKE ${`%${key}%`} ORDER BY posted_at DESC LIMIT 20
      `;

      const allFound = [...mainThreads, ...archivedThreads].filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

      if (allFound.length > 0 || writeLogs.length > 0) {
        return c.render(
          <html lang="ja">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>スレッド検索結果 - {bbs}</title>
              <link rel="stylesheet" href="/app/style.css" />
            </head>
            <body className="bg-gray-100 text-gray-800">
              <div className="container mx-auto px-2 py-4 max-w-4xl">
                <div className="text-xs text-gray-500 mb-2">
                  <a href="/" className="text-blue-600 hover:underline">Home</a>
                  &gt; <span>{bbs}</span>
                </div>
                <h1 className="text-lg font-bold text-purple-700 mb-4">以下のスレッドが見つかりました</h1>

                {allFound.length > 0 && (
                  <>
                    <h2 className="text-md font-semibold text-gray-700 mb-2">スレッド一覧</h2>
                    <ul className="space-y-1 mb-4">
                      {allFound.map((t) => (
                        <li key={t.id}>
                          <a href={`/test/read.cgi/${bbs}/${t.epoch_id}/l50`} className="text-blue-600 hover:underline">
                            {t.title}
                          </a>
                          <span className="text-gray-400 text-xs ml-2">({formatDate(t.updated_at)})</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {writeLogs.length > 0 && (
                  <>
                    <h2 className="text-md font-semibold text-gray-700 mb-2">最近の書き込み</h2>
                    <ul className="space-y-1">
                      {writeLogs.map((w) => (
                        <li key={`${w.thread_id}-${w.response_number}`}>
                          <a href={`/threads/${w.thread_id}`} className="text-blue-600 hover:underline">
                            {w.author_name} (#{w.response_number})
                          </a>
                          <span className="text-gray-400 text-xs ml-2">({formatDate(w.posted_at)})</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </body>
          </html>
        );
      }
    }
    c.status(404);
    return c.render(<div className="text-red-500">スレッドが見つかりません</div>);
  }

  const options = parseOptions(queryString);
  let responsesResult: Result<ReadThreadWithResponses, Error>;

  switch (options.type) {
    case "latest":
      responsesResult = await getLatestResponsesByThreadIdAndCountUsecase(
        { sql, logger }, { threadIdRaw: threadId, countRaw: options.count }
      );
      break;
    case "single":
      responsesResult = await getResponseByThreadIdAndResNumUsecase(
        { sql, logger }, { threadIdRaw: threadId, responseNumberRaw: options.count }
      );
      break;
    case "range":
      responsesResult = await getResponseByThreadIdAndResNumRangeUsecase(
        { sql, logger }, {
          threadIdRaw: threadId,
          startResponseNumberRaw: options.start,
          endResponseNumberRaw: options.end,
        }
      );
      break;
    case "nofirst": {
      const all = await getAllResponsesByThreadEpochIdUsecase({ sql, logger }, { threadEpochIdRaw: key });
      if (all.isOk()) {
        const filtered = all.value.responses.filter(r => r.responseNumber.val > 1);
        const filteredValue: ReadThreadWithResponses = {
          ...all.value,
          responses: filtered,
        };
        responsesResult = okResult(filteredValue) as unknown as Result<ReadThreadWithResponses, Error>;
      } else {
        responsesResult = all;
      }
      break;
    }
    default:
      responsesResult = await getAllResponsesByThreadEpochIdUsecase({ sql, logger }, { threadEpochIdRaw: key });
  }

  if (responsesResult.isErr()) {
    c.status(404);
    return c.render(<div className="text-red-500">{responsesResult.error.message}</div>);
  }

  const data = responsesResult.value;
  const responseCount = data.thread.responseCount;
  const reserveWarn = responseCount >= RESMAX;
  const reserveNear = responseCount >= Math.floor(RESMAX * 0.95);

  const firstResponse = data.responses[0];
  const ogDescription = firstResponse
    ? firstResponse.responseContent.val.substring(0, 200)
    : data.thread.threadTitle.val;

  const latestNumber = data.responses[data.responses.length - 1]?.responseNumber.val || 0;

  const viewerIp = getIpAddress(c);
  const viewerSlip = generateSlip(viewerIp, c.req.header("User-Agent") ?? "", c.req.header("Accept-Language") ?? "");

  const pageChunks: { label: string; href: string }[] = [];
  for (let i = 1; i <= responseCount; i += 100) {
    const end = Math.min(i + 99, responseCount);
    pageChunks.push({ label: `${i}-${end}`, href: `/test/read.cgi/${bbs}/${key}/${i}-${end}` });
  }

  const userCookie = getUserCookieData(c);

  return c.render(
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{data.thread.threadTitle.val} - {bbs}</title>
        <meta property="og:title" content={data.thread.threadTitle.val} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
        <link rel="stylesheet" href="/app/style.css" />
      </head>
      <body className="bg-gray-100 text-gray-800">
        <div className="container mx-auto px-2 py-4 max-w-4xl">
          <div className="text-xs text-gray-500 mb-2 flex gap-2">
            <a href="/" className="text-blue-600 hover:underline">Home</a>
            &gt;
            <span>{bbs}</span>
            &gt;
            <a href={`/test/read.cgi/${bbs}/${key}/l50`} className="text-blue-600 hover:underline">{data.thread.threadTitle.val}</a>
          </div>

          {reserveNear && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded mb-2 text-sm font-bold">
              このスレッドはもうすぐ容量がいっぱいになります。
            </div>
          )}
          {reserveWarn && (
            <div className="bg-red-100 border border-red-400 text-red-800 px-3 py-2 rounded mb-2 text-sm font-bold">
              このスレッドは容量がいっぱいです。新しいスレッドを立ててください。
            </div>
          )}

          <div className="text-center mb-2">
            <h1 className="text-lg font-bold text-purple-700">{data.thread.threadTitle.val}</h1>
            <span className="text-sm text-gray-500">({responseCount})</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3 text-xs">
            {pageChunks.slice(0, 20).map((chunk) => (
              <a key={chunk.label} href={chunk.href} className="text-blue-600 hover:underline px-1 border-r border-gray-300 last:border-r-0">
                {chunk.label}
              </a>
            ))}
          </div>

          <div className="flex gap-2 mb-3 text-xs">
            <a href={`/test/read.cgi/${bbs}/${key}/1-100`} className="text-blue-600 hover:underline">1-100</a>
            <a href={`/test/read.cgi/${bbs}/${key}/101-200`} className="text-blue-600 hover:underline">101-200</a>
            <a href={`/test/read.cgi/${bbs}/${key}/l50`} className="text-blue-600 hover:underline">最新50</a>
            <a href={`/test/read.cgi/${bbs}/${key}/${latestNumber}-`} className="text-blue-600 hover:underline">最新</a>
            <a href={`/test/read.cgi/${bbs}/${key}/nofirst`} className="text-blue-600 hover:underline">nofirst</a>
          </div>

          <div className={`space-y-1 ${readType === "5ch" ? "font-sans" : ""}`}>
            {data.responses.map((resp) => {
              const renderedContent = convertAll(resp.responseContent.val, {
                server: "",
                cgiPath: "",
                bbs,
                key,
                usePathInfo: true,
                cushion: "",
                isMobile: false,
              });

              if (readType === "5ch") {
                return (
                  <div key={resp.responseNumber.val} id={String(resp.responseNumber.val)} className="bg-white border border-gray-200 p-2 mb-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-bold text-purple-700">{resp.responseNumber.val}</span>
                      <span className={`${isSage(resp.mail) ? "text-violet-600" : ""}`} style={{ color: resp.authorName.val.color || nameColor }}>
                        {formatReadAuthorName(resp.authorName, resp.capcode)}
                      </span>
                      <span className="text-gray-400 text-xs">{formatDate(resp.postedAt.val, { acceptLanguage: c.req.header("Accept-Language") ?? undefined })}</span>
                      {resp.dailyId && <span className="text-gray-400 text-xs">ID:{resp.dailyId}</span>}
                      <span className="text-gray-400 text-xs">ID:{resp.hashId.val}</span>
                      <span className="text-gray-400 text-xs">{viewerSlip}</span>
                    </div>
                    <div className="text-sm mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedContent) }} />
                  </div>
                );
              }

              return (
                <dl key={resp.responseNumber.val} id={String(resp.responseNumber.val)} className="bg-white border border-gray-200 p-2 mb-1">
                  <dt className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-bold text-purple-700">{resp.responseNumber.val}</span>
                    <span className={`${isSage(resp.mail) ? "text-violet-600" : ""}`} style={{ color: resp.authorName.val.color || nameColor }}>
                      {formatReadAuthorName(resp.authorName, resp.capcode)}
                    </span>
                    <span className="text-gray-400 text-xs">{formatDate(resp.postedAt.val, { acceptLanguage: c.req.header("Accept-Language") ?? undefined })}</span>
                    {resp.dailyId && <span className="text-gray-400 text-xs">ID:{resp.dailyId}</span>}
                    <span className="text-gray-400 text-xs">ID:{resp.hashId.val}</span>
                  </dt>
                  <dd className="text-sm mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedContent) }} />
                </dl>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3 mb-4 text-xs">
            <a href={`/test/read.cgi/${bbs}/${key}/1-100`} className="text-blue-600 hover:underline">1-100</a>
            <a href={`/test/read.cgi/${bbs}/${key}/101-200`} className="text-blue-600 hover:underline">101-200</a>
            <a href={`/test/read.cgi/${bbs}/${key}/l50`} className="text-blue-600 hover:underline">最新50</a>
            <a href={`/test/read.cgi/${bbs}/${key}/${latestNumber}-`} className="text-blue-600 hover:underline">最新</a>
            <a href={`/test/read.cgi/${bbs}/${key}/nofirst`} className="text-blue-600 hover:underline">nofirst</a>
          </div>

          <div className="flex gap-2 mb-4 text-xs">
            {Math.max(1, latestNumber - 100) > 1 && (
              <a href={`/test/read.cgi/${bbs}/${key}/${Math.max(1, latestNumber - 199)}-${Math.max(100, latestNumber - 100)}`} className="text-blue-600 hover:underline">
                前の100件
              </a>
            )}
            {latestNumber < responseCount && (
              <a href={`/test/read.cgi/${bbs}/${key}/${latestNumber + 1}-${Math.min(responseCount, latestNumber + 100)}`} className="text-blue-600 hover:underline">
                次の100件
              </a>
            )}
          </div>

          <div className="bg-gray-200 text-center py-2 mb-4">
            <img src={`https://counter.ofuda.cc/count/${encodeURIComponent(`${bbs}-${key}`)}`} alt="counter" className="inline-block" />
          </div>

          <section className="bg-white border border-gray-300 p-4 mb-4">
            <h2 className="text-sm font-bold mb-3">書き込む</h2>
            <form method="post" action={`/test/read.cgi/${bbs}/${key}`} className="flex flex-col gap-3" encType="application/x-www-form-urlencoded; charset=Shift_JIS">
              <div className="flex gap-3">
                <label className="text-xs text-gray-700">名前:
                  <input type="text" name="FROM" value={userCookie.name} className="border border-gray-400 rounded py-1 px-2 text-sm w-40" />
                </label>
                <label className="text-xs text-gray-700">メール:
                  <input type="text" name="mail" value={userCookie.mail} className="border border-gray-400 rounded py-1 px-2 text-sm w-40" />
                </label>
              </div>
              <div>
                <textarea name="MESSAGE" required className="border border-gray-400 rounded w-full py-1 px-2 text-sm h-24"></textarea>
              </div>
              <button type="submit" className="bg-purple-500 hover:bg-purple-700 text-white text-sm font-bold py-1 px-4 rounded w-24">
                書き込む
              </button>
            </form>
          </section>

          <div className="text-center text-xs text-gray-400 mt-4">
            <a href={`/threads/${threadId}`} className="text-blue-600 hover:underline">標準表示</a>
            {" | "}
            <a href={`/test/read.cgi/${bbs}/${key}/l50`} className="text-blue-600 hover:underline">read.cgi</a>
          </div>
        </div>
      </body>
    </html>
  );
});
