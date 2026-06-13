import { createRoute } from "honox/factory";

import { getTimelineRepository } from "../../src/timeline/repositories/getTimelineRepository";
import { ErrorMessage } from "../components/ErrorMessage";

import type { TimelineEntry } from "../../src/timeline/repositories/getTimelineRepository";

type ThreadTitleMap = Record<string, string>;

const fetchThreadTitles = async (
  sql: Parameters<typeof getTimelineRepository>[0]["sql"],
  threadIds: string[]
): Promise<ThreadTitleMap> => {
  if (threadIds.length === 0) return {};
  const rows = await sql<{ id: string; title: string }[]>`
    SELECT id, title FROM threads WHERE id = ANY(${threadIds}::uuid[])
  `;
  const map: ThreadTitleMap = {};
  for (const row of rows || []) {
    map[row.id] = row.title;
  }
  return map;
};

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  logger.info({
    operation: "timeline/GET",
    path: c.req.path,
    method: c.req.method,
    message: "Timeline page requested",
  });

  if (!sql) {
    logger.error({
      operation: "timeline/GET",
      message: "Database connection not available",
    });
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const result = await getTimelineRepository({ sql, logger }, { limit: 50 });
  if (result.isErr()) {
    logger.error({
      operation: "timeline/GET",
      error: result.error,
      message: "Failed to fetch timeline entries",
    });
    return c.render(<ErrorMessage error={result.error} />);
  }

  const entries = result.value;
  const threadIds = [...new Set(entries.map((e) => e.thread_id))];
  const threadTitles = await fetchThreadTitles(sql, threadIds);

  const truncate = (text: string, max: number): string =>
    text.length > max ? text.slice(0, max) + "..." : text;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">タイムライン</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          掲示板の最近の投稿を時系列で表示します
        </p>

        {entries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">投稿はまだありません。</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry: TimelineEntry) => {
              const threadTitle = threadTitles[entry.thread_id] || "不明なスレッド";
              return (
                <div
                  key={entry.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <a
                      href={`/threads/${entry.thread_id}/l50`}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-semibold text-sm"
                    >
                      {threadTitle}
                    </a>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {new Date(entry.posted_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{entry.author_name}</span>
                    {entry.mail ? ` [${entry.mail}]` : ""}
                    {" No."}
                    {entry.response_number}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {truncate(entry.response_content, 200)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <a href="/" className="text-blue-500 dark:text-blue-400 hover:underline">
            掲示板に戻る
          </a>
        </div>
      </section>
    </main>
  );
});
