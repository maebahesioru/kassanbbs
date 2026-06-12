import { createRoute } from "honox/factory";

import { toZonedTime, format } from "date-fns-tz";
import { getAllThreadsRepository } from "../../../src/conversation/repositories/getAllThreadsRepository";
import { archiveThreadUsecase } from "../../../src/archive/usecases/archiveThreadUsecase";
import { unarchiveThreadUsecase } from "../../../src/archive/usecases/unarchiveThreadUsecase";
import { autoArchiveUsecase } from "../../../src/archive/usecases/autoArchiveUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("threads.archive"),
  async (c) => {
  const { sql, logger } = c.var;

  logger.info({
    operation: "admin/archive/POST",
    path: c.req.path,
    method: c.req.method,
    message: "Archive management POST action",
  });

  if (!sql) {
    logger.error({
      operation: "admin/archive/POST",
      message: "Database connection not available",
    });
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;
  const threadId = body.threadId;
  const adminIp = getIpAddress(c);

  if (action === "archive" && typeof threadId === "string") {
    logger.info({
      operation: "admin/archive/POST",
      threadId,
      action: "archive",
      message: "Manually archiving thread",
    });

    const result = await archiveThreadUsecase(
      { sql, logger },
      { threadIdRaw: threadId }
    );
    if (result.isErr()) {
      logger.error({
        operation: "admin/archive/POST",
        error: result.error,
        threadId,
        message: "Failed to archive thread",
      });
      return c.render(<ErrorMessage error={result.error} />);
    }

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "スレッドアーカイブ",
        detail: `スレッドID: ${threadId}`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "unarchive" && typeof threadId === "string") {
    logger.info({
      operation: "admin/archive/POST",
      threadId,
      action: "unarchive",
      message: "Manually unarchiving thread",
    });

    const result = await unarchiveThreadUsecase(
      { sql, logger },
      { threadIdRaw: threadId }
    );
    if (result.isErr()) {
      logger.error({
        operation: "admin/archive/POST",
        error: result.error,
        threadId,
        message: "Failed to unarchive thread",
      });
      return c.render(<ErrorMessage error={result.error} />);
    }

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "スレッドアーカイブ解除",
        detail: `スレッドID: ${threadId}`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "autoarchive") {
    const daysRaw = body.days;
    const days = typeof daysRaw === "string" ? parseInt(daysRaw, 10) : 30;

    logger.info({
      operation: "admin/archive/POST",
      action: "autoarchive",
      days: isNaN(days) ? 30 : days,
      message: "Running auto-archive",
    });

    const result = await autoArchiveUsecase(
      { sql, logger },
      isNaN(days) ? 30 : days
    );
    if (result.isErr()) {
      logger.error({
        operation: "admin/archive/POST",
        error: result.error,
        message: "Auto-archive failed",
      });
      return c.render(<ErrorMessage error={result.error} />);
    }

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "自動アーカイブ実行",
        detail: `${result.value}件のスレッドをアーカイブしました（${isNaN(days) ? 30 : days}日ルール）`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/archive", 303);
});

const formatDisplayDate = (date: Date): string => {
  const jstDate = toZonedTime(date, "Asia/Tokyo");
  return format(jstDate, "yyyy/MM/dd HH:mm:ss", { timeZone: "Asia/Tokyo" });
};

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  logger.info({
    operation: "admin/archive/GET",
    path: c.req.path,
    method: c.req.method,
    message: "Admin archive management page requested",
  });

  if (!sql) {
    logger.error({
      operation: "admin/archive/GET",
      message: "Database connection not available",
    });
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const threadsResult = await getAllThreadsRepository({ sql, logger });

  let allThreads: any[] = [];
  if (threadsResult.isOk()) {
    allThreads = threadsResult.value;
  }

  const archivedThreads = allThreads.filter(
    (t: any) => t.isStopped && t.isPooled
  );
  const activeThreads = allThreads.filter(
    (t: any) => !(t.isStopped && t.isPooled)
  );

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          アーカイブ管理
        </h1>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">自動アーカイブ</h2>
          <form method="post" action="/admin/archive" className="flex items-end gap-4">
            <input type="hidden" name="action" value="autoarchive" />
            <div className="flex flex-col">
              <label
                htmlFor="days"
                className="text-gray-700 text-sm font-bold mb-1"
              >
                最終更新から何日経過でアーカイブするか
              </label>
              <input
                type="number"
                id="days"
                name="days"
                defaultValue={30}
                className="border border-gray-400 rounded py-2 px-3 w-24"
              />
            </div>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
            >
              自動アーカイブ実行
            </button>
          </form>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            アクティブスレッド ({activeThreads.length})
          </h2>
          {activeThreads.length === 0 ? (
            <p className="text-gray-500">アクティブなスレッドはありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">タイトル</th>
                    <th className="p-2 text-left">レス数</th>
                    <th className="p-2 text-left">最終更新</th>
                    <th className="p-2 text-left">状態</th>
                    <th className="p-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activeThreads.map((thread: any) => (
                    <tr key={thread.id.val} className="border-t">
                      <td className="p-2">
                        <a
                          href={`/threads/${thread.id.val}/l50`}
                          className="text-purple-600 hover:underline"
                        >
                          {thread.title.val}
                        </a>
                      </td>
                      <td className="p-2">{thread.countResponse}</td>
                      <td className="p-2 whitespace-nowrap">
                        {formatDisplayDate(thread.updatedAt.val)}
                      </td>
                      <td className="p-2">
                        {thread.isStopped && (
                          <span className="text-red-500 text-xs mr-1">停止</span>
                        )}
                        {thread.isPooled && (
                          <span className="text-yellow-500 text-xs">プール</span>
                        )}
                      </td>
                      <td className="p-2">
                        <form
                          method="post"
                          action="/admin/archive"
                          className="inline"
                        >
                          <input
                            type="hidden"
                            name="threadId"
                            value={thread.id.val}
                          />
                          <input type="hidden" name="action" value="archive" />
                          <button
                            type="submit"
                            className="bg-gray-500 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded"
                          >
                            アーカイブ
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">
            アーカイブ済み ({archivedThreads.length})
          </h2>
          {archivedThreads.length === 0 ? (
            <p className="text-gray-500">アーカイブされたスレッドはありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">タイトル</th>
                    <th className="p-2 text-left">レス数</th>
                    <th className="p-2 text-left">最終更新</th>
                    <th className="p-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedThreads.map((thread: any) => (
                    <tr key={thread.id.val} className="border-t">
                      <td className="p-2">
                        <a
                          href={`/threads/${thread.id.val}/l50`}
                          className="text-purple-600 hover:underline"
                        >
                          {thread.title.val}
                        </a>
                      </td>
                      <td className="p-2">{thread.countResponse}</td>
                      <td className="p-2 whitespace-nowrap">
                        {formatDisplayDate(thread.updatedAt.val)}
                      </td>
                      <td className="p-2">
                        <form
                          method="post"
                          action="/admin/archive"
                          className="inline"
                        >
                          <input
                            type="hidden"
                            name="threadId"
                            value={thread.id.val}
                          />
                          <input
                            type="hidden"
                            name="action"
                            value="unarchive"
                          />
                          <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
                          >
                            アーカイブ解除
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <a href="/admin" className="text-blue-600 hover:underline">
            管理者画面に戻る
          </a>
        </div>
      </section>
    </main>
  );
});
