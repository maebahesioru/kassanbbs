import { createRoute } from "honox/factory";

import { getArchivedThreadsUsecase } from "../../src/archive/usecases/getArchivedThreadsUsecase";
import { ErrorMessage } from "../components/ErrorMessage";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  logger.info({
    operation: "archive/GET",
    path: c.req.path,
    method: c.req.method,
    message: "Archive page requested",
  });

  if (!sql) {
    logger.error({
      operation: "archive/GET",
      message: "Database connection not available",
    });
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const result = await getArchivedThreadsUsecase({ sql, logger });

  if (result.isErr()) {
    logger.error({
      operation: "archive/GET",
      error: result.error,
      message: "Failed to fetch archived threads",
    });
    return c.render(<ErrorMessage error={result.error} />);
  }

  const threads = result.value;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">過去ログ倉庫</h1>

        <p className="mb-4">
          アーカイブされたスレッドが{threads.length}件あります
        </p>

        <ul className="flex flex-col gap-2">
          {threads.map((thread, index) => (
            <li key={thread.id.val}>
              <a
                className="text-purple-600 hover:underline"
                href={`/threads/${thread.id.val}/l50`}
              >
                {index + 1}: {thread.title.val} ({thread.countResponse})
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <a href="/subback.html" className="text-blue-600 hover:underline">
            スレッド一覧に戻る
          </a>
        </div>
      </section>
    </main>
  );
});
