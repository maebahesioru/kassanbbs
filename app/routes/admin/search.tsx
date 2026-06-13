import { createRoute } from "honox/factory";

import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const highlight = (text: string, query: string): string => {
  if (!query) return escapeHtml(text);
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escapeHtml(text).split(new RegExp(`(${escapedQ})`, "gi"))
    .map((part, i) => part.toLowerCase() === query.toLowerCase() ? `<mark class="bg-yellow-200 text-black">${part}</mark>` : part)
    .join("");
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(<ErrorMessage error={new Error("DBに接続できませんでした")} />);
  }

  const body = await c.req.parseBody();
  const q = typeof body.q === "string" ? body.q.trim() : "";
  const searchBy = typeof body.searchBy === "string" ? body.searchBy : "all";
  const target = typeof body.target === "string" ? body.target : "all";
  const board = typeof body.board === "string" ? body.board.trim() : "";
  const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom : "";
  const dateTo = typeof body.dateTo === "string" ? body.dateTo : "";

  if (!q && !dateFrom && !dateTo) {
    return c.redirect("/admin/search", 303);
  }

  const adminIp = getIpAddress(c);
  await addAdminLogUsecase({ sql, logger }, {
    action: "検索実行",
    detail: `検索クエリ: ${q || "(none)"}, 対象: ${target}, 検索方法: ${searchBy}, 日付範囲: ${dateFrom || ""}~${dateTo || ""}`,
    ipAddress: adminIp,
  });

  const likePattern = q ? `%${q}%` : "%";
  const dateFilter =
    dateFrom || dateTo
      ? ` AND posted_at >= ${dateFrom ? `'${dateFrom} 00:00:00+09'::timestamptz` : "'1970-01-01'::timestamptz"} AND posted_at <= ${dateTo ? `'${dateTo} 23:59:59+09'::timestamptz` : "NOW()"}`
      : "";

  const results: {
    type: string;
    id: string;
    title: string;
    detail: string;
    date: Date;
    link: string;
    boardName?: string;
  }[] = [];

  const showThreads = target === "all" || target === "threads";
  const showResponses = target === "all" || target === "responses";
  const showLogs = target === "all" || target === "logs";
  const showNinpocho = target === "all" || target === "ninpocho";

  if (showThreads && q) {
    if (searchBy === "all" || searchBy === "name" || searchBy === "title") {
      const threadCol = searchBy === "name" ? "t.title" : "t.title";
      const threads = await sql<{ id: string; title: string; posted_at: Date; updated_at: Date; response_count: number }[]>`
        SELECT t.id, t.title, t.posted_at, t.updated_at, COUNT(r.id)::int as response_count
        FROM threads t LEFT JOIN responses r ON t.id = r.thread_id
        WHERE ${sql(threadCol)} ILIKE ${likePattern}
        GROUP BY t.id, t.title, t.posted_at, t.updated_at
        ORDER BY t.updated_at DESC LIMIT 100
      `;
      for (const t of threads) {
        results.push({
          type: "スレッド",
          id: t.id,
          title: t.title,
          detail: `レス数: ${t.response_count}`,
          date: t.updated_at,
          link: `/threads/${t.id}`,
        });
      }
    }
    if (searchBy === "all" || searchBy === "id") {
      const threadsByEpoch = await sql<{ id: string; title: string; epoch_id: number; updated_at: Date }[]>`
        SELECT id, title, epoch_id, updated_at FROM threads WHERE epoch_id::text ILIKE ${likePattern} ORDER BY updated_at DESC LIMIT 50
      `;
      for (const t of threadsByEpoch) {
        results.push({
          type: "スレッド(epoch)",
          id: t.id,
          title: t.title,
          detail: `epoch_id: ${t.epoch_id}`,
          date: t.updated_at,
          link: `/threads/${t.id}`,
        });
      }
    }
  }

  if (showResponses && q) {
    if (searchBy === "all" || searchBy === "name") {
      const respByName = await sql<{ id: string; thread_id: string; response_number: number; author_name: string; response_content: string; posted_at: Date; t_title: string }[]>`
        SELECT r.id, r.thread_id, r.response_number, r.author_name, r.response_content, r.posted_at, t.title as t_title
        FROM responses r JOIN threads t ON r.thread_id = t.id
        WHERE r.author_name ILIKE ${likePattern}
        ORDER BY r.posted_at DESC LIMIT 100
      `;
      for (const r of respByName) {
        results.push({
          type: "レス(名前)",
          id: r.id,
          title: r.t_title,
          detail: `#${r.response_number} ${r.author_name}: ${r.response_content.substring(0, 100)}`,
          date: r.posted_at,
          link: `/threads/${r.thread_id}`,
        });
      }
    }
    if (searchBy === "all" || searchBy === "body") {
      const respByBody = await sql<{ id: string; thread_id: string; response_number: number; author_name: string; response_content: string; posted_at: Date; t_title: string }[]>`
        SELECT r.id, r.thread_id, r.response_number, r.author_name, r.response_content, r.posted_at, t.title as t_title
        FROM responses r JOIN threads t ON r.thread_id = t.id
        WHERE r.response_content ILIKE ${likePattern}
        ORDER BY r.posted_at DESC LIMIT 100
      `;
      for (const r of respByBody) {
        results.push({
          type: "レス(本文)",
          id: r.id,
          title: r.t_title,
          detail: `#${r.response_number} ${r.author_name}: ${r.response_content.substring(0, 100)}`,
          date: r.posted_at,
          link: `/threads/${r.thread_id}`,
        });
      }
    }
    if (searchBy === "all" || searchBy === "mail") {
      const respByMail = await sql<{ id: string; thread_id: string; response_number: number; author_name: string; response_content: string; mail: string; posted_at: Date; t_title: string }[]>`
        SELECT r.id, r.thread_id, r.response_number, r.author_name, r.response_content, r.mail, r.posted_at, t.title as t_title
        FROM responses r JOIN threads t ON r.thread_id = t.id
        WHERE r.mail ILIKE ${likePattern}
        ORDER BY r.posted_at DESC LIMIT 100
      `;
      for (const r of respByMail) {
        results.push({
          type: "レス(X ID)",
          id: r.id,
          title: r.t_title,
          detail: `#${r.response_number} ${r.author_name} (${r.mail})`,
          date: r.posted_at,
          link: `/threads/${r.thread_id}`,
        });
      }
    }
  }

  if (showLogs && q) {
    const logWhere =
      searchBy === "all"
        ? sql`action ILIKE ${likePattern} OR detail ILIKE ${likePattern}`
        : searchBy === "name" || searchBy === "body"
        ? sql`detail ILIKE ${likePattern}`
        : searchBy === "id" || searchBy === "mail"
        ? sql`ip_address ILIKE ${likePattern}`
        : sql`action ILIKE ${likePattern}`;
    const logs = await sql<{ id: string; action: string; detail: string; ip_address: string; created_at: Date; log_type: string }[]>`
      SELECT id, action, detail, ip_address, created_at, log_type FROM admin_logs WHERE ${logWhere}
      ORDER BY created_at DESC LIMIT 100
    `;
    for (const l of logs) {
      results.push({
        type: `ログ(${l.log_type})`,
        id: l.id,
        title: l.action,
        detail: `${l.detail} [${l.ip_address}]`,
        date: l.created_at,
        link: `/admin?logType=${l.log_type}`,
      });
    }
  }

  if (showNinpocho && q) {
    if (searchBy === "all" || searchBy === "id" || searchBy === "mail") {
      const ninpocho = await sql<{ id: string; hash_id: string; ip_address: string; error_count: number; ban_level: number; ban_until: Date | null; created_at: Date }[]>`
        SELECT id, hash_id, ip_address, error_count, ban_level, ban_until, created_at
        FROM ninpocho_records
        WHERE hash_id ILIKE ${likePattern} OR ip_address ILIKE ${likePattern}
        ORDER BY created_at DESC LIMIT 50
      `;
      for (const n of ninpocho) {
        results.push({
          type: "忍法帖",
          id: n.hash_id,
          title: n.hash_id,
          detail: `IP: ${n.ip_address}, エラー: ${n.error_count}, BAN: Lv${n.ban_level}${n.ban_until ? ` until ${n.ban_until.toLocaleString("ja-JP")}` : ""}`,
          date: n.created_at,
          link: "/admin/ninpocho",
        });
      }
    }
  }

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/search" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">検索</h1>

        <form method="post" action="/admin/search" className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <label className="text-gray-700 text-sm font-bold mb-1 block">検索ワード</label>
                <input type="text" name="q" defaultValue={q} className="border border-gray-400 rounded py-2 px-3 w-full" placeholder="検索ワードを入力" />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">板名(省略可)</label>
                <input type="text" name="board" defaultValue={board} className="border border-gray-400 rounded py-2 px-3 w-32" placeholder="板名" />
              </div>
              <button type="submit" className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded">検索</button>
            </div>

            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">検索方法</label>
                <select name="searchBy" className="border border-gray-400 rounded py-2 px-3">
                  <option value="all" selected={searchBy === "all"}>すべて</option>
                  <option value="name" selected={searchBy === "name"}>名前/タイトル</option>
                  <option value="body" selected={searchBy === "body"}>本文</option>
                  <option value="id" selected={searchBy === "id"}>ID/Hash</option>
                  <option value="mail" selected={searchBy === "mail"}>X ID</option>
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">対象</label>
                <select name="target" className="border border-gray-400 rounded py-2 px-3">
                  <option value="all" selected={target === "all"}>すべて</option>
                  <option value="threads" selected={target === "threads"}>スレッド</option>
                  <option value="responses" selected={target === "responses"}>レス</option>
                  <option value="logs" selected={target === "logs"}>管理ログ</option>
                  <option value="ninpocho" selected={target === "ninpocho"}>忍法帖</option>
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">開始日</label>
                <input type="date" name="dateFrom" defaultValue={dateFrom} className="border border-gray-400 rounded py-2 px-3" />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">終了日</label>
                <input type="date" name="dateTo" defaultValue={dateTo} className="border border-gray-400 rounded py-2 px-3" />
              </div>
            </div>
          </div>
        </form>

        {results.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">検索結果 ({results.length}件)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">種別</th>
                    <th className="p-2 text-left">タイトル</th>
                    <th className="p-2 text-left">詳細</th>
                    <th className="p-2 text-left">日時</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={`${r.type}-${r.id}`} className="border-t hover:bg-gray-50">
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          r.type.startsWith("スレッド") ? "bg-blue-100 text-blue-800" :
                          r.type.startsWith("レス") ? "bg-green-100 text-green-800" :
                          r.type.startsWith("ログ") ? "bg-gray-100 text-gray-800" :
                          "bg-red-100 text-red-800"
                        }`}>{r.type}</span>
                      </td>
                      <td className="p-2 max-w-xs" dangerouslySetInnerHTML={{ __html: highlight(r.title, q) }} />
                      <td className="p-2 max-w-md truncate" dangerouslySetInnerHTML={{ __html: highlight(r.detail, q) }} />
                      <td className="p-2 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {results.length === 0 && q && (
          <p className="text-gray-500 text-center py-8">検索結果が見つかりませんでした</p>
        )}
      </section>
    </main>
  );
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(<ErrorMessage error={new Error("DBに接続できませんでした")} />);
  }

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/search" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">検索</h1>

        <form method="post" action="/admin/search">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <label className="text-gray-700 text-sm font-bold mb-1 block">検索ワード</label>
                <input type="text" name="q" className="border border-gray-400 rounded py-2 px-3 w-full" placeholder="検索ワードを入力" />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">板名(省略可)</label>
                <input type="text" name="board" className="border border-gray-400 rounded py-2 px-3 w-32" placeholder="板名" />
              </div>
              <button type="submit" className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded mt-6">検索</button>
            </div>

            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">検索方法</label>
                <select name="searchBy" className="border border-gray-400 rounded py-2 px-3">
                  <option value="all">すべて</option>
                  <option value="name">名前/タイトル</option>
                  <option value="body">本文</option>
                  <option value="id">ID/Hash</option>
                  <option value="mail">X ID</option>
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">対象</label>
                <select name="target" className="border border-gray-400 rounded py-2 px-3">
                  <option value="all">すべて</option>
                  <option value="threads">スレッド</option>
                  <option value="responses">レス</option>
                  <option value="logs">管理ログ</option>
                  <option value="ninpocho">忍法帖</option>
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">開始日</label>
                <input type="date" name="dateFrom" className="border border-gray-400 rounded py-2 px-3" />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-bold mb-1 block">終了日</label>
                <input type="date" name="dateTo" className="border border-gray-400 rounded py-2 px-3" />
              </div>
            </div>
          </div>
        </form>

        <p className="text-gray-400 text-center py-8">検索ワードを入力して検索ボタンをクリックしてください</p>
      </section>
    </main>
  );
});
