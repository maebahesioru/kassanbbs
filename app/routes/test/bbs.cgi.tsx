import Encoding from "encoding-japanese";
import { createRoute } from "honox/factory";
import { getCookie, setCookie } from "hono/cookie";
import iconv from "iconv-lite";

import { postResponseByThreadIdUsecase } from "../../../src/conversation/usecases/postResponseByThreadIdUsecase";
import { postThreadUsecase } from "../../../src/conversation/usecases/postThreadUsecase";
import { getThreadIdByThreadEpochIdRepository } from "../../../src/conversation/repositories/getThreadIdByThreadEpochIdRepository";
import { createWriteThreadEpochId } from "../../../src/conversation/domain/write/WriteThreadEpochId";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { logFailureUsecase } from "../../../src/failurelog/usecases/logFailureUsecase";
import { ErrorCodes } from "../../../src/error/completeErrorCodes";
import { getBoardByKeyRepository } from "../../../src/board/repositories/getBoardByKeyRepository";
import { convertShiftJis } from "../../utils/convertShiftJis";
import { getIpAddress } from "../../utils/getIpAddress";

const responseBody = `<!DOCTYPE html>
<html lang="ja">
  <head><title>書きこみました。</title><meta charset="Shift_JIS"></head>
  <body>書きこみが終りました。</body>
</html>`;

const responseBodyShiftJis = iconv.encode(responseBody, "Shift_JIS");

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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const contentLength = parseInt(c.req.header("Content-Length") || "0", 10);
  if (contentLength > 262144) {
    return c.text("Request too large", 413);
  }

  const startTime = performance.now();
  const { sql, logger } = c.var;

  if (!sql) {
    return convertShiftJis("DBに接続できませんでした");
  }

  const rawBody = await c.req.arrayBuffer();
  const decodedBody = iconv.decode(Buffer.from(rawBody), "Shift_JIS");
  const paramsMap = new Map<string, string>();

  for (const pair of decodedBody.split("&")) {
    const [key, value] = pair.split("=");
    paramsMap.set(key, value);
  }

  const paramsDecodedMap = new Map<string, string>();
  for (const [key, value] of paramsMap) {
    const decodedValue = Encoding.urlDecode(value);
    const utf8Value = iconv.decode(Buffer.from(decodedValue), "Shift_JIS");
    paramsDecodedMap.set(key, utf8Value);
  }

  const name =
    typeof paramsDecodedMap.get("FROM") === "string"
      ? (paramsDecodedMap.get("FROM") as string)
      : null;
  const mail =
    typeof paramsDecodedMap.get("mail") === "string"
      ? (paramsDecodedMap.get("mail") as string)
      : null;
  const content = paramsDecodedMap.get("MESSAGE");
  const subject = paramsDecodedMap.get("subject");
  const key = paramsDecodedMap.get("key");
  const bbs = paramsDecodedMap.get("bbs") || "main";

  let boardId: string | undefined;
  const boardResult = await getBoardByKeyRepository({ sql, logger }, { boardKey: bbs });
  if (boardResult.isOk()) {
    boardId = boardResult.value.id;
  }

  if (!content) {
    return convertShiftJis("名前と本文は必須です。");
  }

  if (!subject && !key) {
    return convertShiftJis("不正なアクセスです");
  }

  const ipAddressRaw = getIpAddress(c);
  const expandedIp = expandIPv6(ipAddressRaw);
  const hostname = c.req.header("Host") ?? ipAddressRaw;
  const userAgent = c.req.header("User-Agent") ?? "";
  const threadKey = subject || key || "UNKNOWN";
  const mobileProductId = detectMobileProductId(userAgent);

  const testCookieName = "vak_cookie_test";
  const existingCookie = getCookie(c, testCookieName);
  if (!existingCookie) {
    setCookie(c, testCookieName, "1", { path: "/", maxAge: 10 });
    return convertShiftJis("Cookieを有効にしてください");
  }

  const detailParts: string[] = [];
  if (expandedIp !== ipAddressRaw) detailParts.push(`IPv6: ${expandedIp}`);
  if (mobileProductId) detailParts.push(`Mobile: ${mobileProductId}`);

  if (subject) {
      const result = await postThreadUsecase(
      { sql, logger },
      {
        threadTitleRaw: subject,
        authorNameRaw: name,
        mailRaw: mail,
        responseContentRaw: content,
        ipAddressRaw,
        remoteHost: hostname,
        userAgent,
        boardId,
      }
    );
    if (result.isErr()) {
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CGI_FORBIDDEN.code,
          errorMessage: result.error.message,
          name: name ?? "",
          mail: mail ?? "",
          content: typeof content === "string" ? content : "",
          ipAddress: ipAddressRaw,
          host: hostname,
          threadKey,
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      return convertShiftJis(`エラーが発生しました: ${result.error.message}`);
    }

    addAdminLogUsecase(
      { sql, logger },
      {
        action: "CGIスレッド作成",
        detail: `スレッドID: ${result.value.val}, タイトル: ${subject}${detailParts.length > 0 ? `, ${detailParts.join(", ")}` : ""}`,
        ipAddress: ipAddressRaw,
        logType: "THR",
      }
    ).catch((err) => { console.error("Async operation failed:", err); });

    const elapsed = performance.now() - startTime;
    if (elapsed > 1000) {
      addAdminLogUsecase({ sql, logger }, {
        action: "CGI遅延警告",
        detail: `処理時間: ${Math.round(elapsed)}ms, スレッド作成`,
        ipAddress: ipAddressRaw,
        logType: "ADMIN",
      }).catch((err) => { console.error("Async operation failed:", err); });
    }

    return new Response(responseBodyShiftJis, {
      headers: { "Content-Type": "text/html; charset=Shift_JIS" },
    });
  } else if (key) {
    const threadEpochIdResult = createWriteThreadEpochId(key);
    if (threadEpochIdResult.isErr()) {
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CGI_FORBIDDEN.code,
          errorMessage: threadEpochIdResult.error.message,
          name: name ?? "",
          mail: mail ?? "",
          content: typeof content === "string" ? content : "",
          ipAddress: ipAddressRaw,
          host: hostname,
          threadKey,
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      return convertShiftJis(`エラーが発生しました: ${threadEpochIdResult.error.message}`);
    }

    const threadIdResult = await getThreadIdByThreadEpochIdRepository(
      { sql, logger },
      { threadEpochId: threadEpochIdResult.value }
    );
    if (threadIdResult.isErr()) {
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.THREAD_MOVED.code,
          errorMessage: threadIdResult.error.message,
          name: name ?? "",
          mail: mail ?? "",
          content: typeof content === "string" ? content : "",
          ipAddress: ipAddressRaw,
          host: hostname,
          threadKey,
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      return convertShiftJis(`エラーが発生しました: ${threadIdResult.error.message}`);
    }

    const result = await postResponseByThreadIdUsecase(
      { sql, logger },
      {
        threadIdRaw: threadIdResult.value.val,
        authorNameRaw: name,
        mailRaw: mail,
        responseContentRaw: content,
        ipAddressRaw,
        remoteHost: hostname,
        userAgent,
        browserFpRaw: null,
        passwordRaw: null,
        hasCapPermission: false,
      }
    );
    if (result.isErr()) {
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CGI_FORBIDDEN.code,
          errorMessage: result.error.message,
          name: name ?? "",
          mail: mail ?? "",
          content: typeof content === "string" ? content : "",
          ipAddress: ipAddressRaw,
          host: hostname,
          threadKey,
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      return convertShiftJis(`エラーが発生しました: ${result.error.message}`);
    }

    addAdminLogUsecase(
      { sql, logger },
      {
        action: "CGIレス作成",
        detail: `スレッドID: ${result.value.threadId.val}, レス番号: ${result.value.responseNumber.val}${detailParts.length > 0 ? `, ${detailParts.join(", ")}` : ""}`,
        ipAddress: ipAddressRaw,
        logType: "WRT",
      }
    ).catch((err) => { console.error("Async operation failed:", err); });

    const elapsed = performance.now() - startTime;
    if (elapsed > 1000) {
      addAdminLogUsecase({ sql, logger }, {
        action: "CGI遅延警告",
        detail: `処理時間: ${Math.round(elapsed)}ms, レス作成`,
        ipAddress: ipAddressRaw,
        logType: "ADMIN",
      }).catch((err) => { console.error("Async operation failed:", err); });
    }

    return new Response(responseBodyShiftJis, {
      headers: { "Content-Type": "text/html; charset=Shift_JIS" },
    });
  }

  const elapsed = performance.now() - startTime;
  if (elapsed > 1000) {
    addAdminLogUsecase({ sql, logger }, {
      action: "CGI遅延警告",
      detail: `処理時間: ${Math.round(elapsed)}ms, 未分類`,
      ipAddress: ipAddressRaw,
      logType: "ADMIN",
    }).catch((err) => { console.error("Async operation failed:", err); });
  }

  return convertShiftJis("不正なアクセスです");
});

export default createRoute((_) => {
  return convertShiftJis("不正なアクセスです");
});
