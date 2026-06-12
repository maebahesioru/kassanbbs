import { createRoute } from "honox/factory";

import { getFailureLogsUsecase, deleteFailureLogUsecase } from "../../../src/failurelog/usecases/logFailureUsecase";
import { postThreadUsecase } from "../../../src/conversation/usecases/postThreadUsecase";
import { postResponseByThreadIdUsecase } from "../../../src/conversation/usecases/postResponseByThreadIdUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";

import type { FailureLog } from "../../../src/failurelog/repositories/getFailureLogsRepository";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;
  const id = body.id;
  const adminIp = getIpAddress(c);

  if (action === "allowPost" && typeof id === "string") {
    const logsResult = await getFailureLogsUsecase({ sql, logger });
    if (logsResult.isErr()) {
      return c.render(<ErrorMessage error={logsResult.error} />);
    }
    const logEntry = logsResult.value.find((l: FailureLog) => l.id === id);
    if (!logEntry) {
      return c.render(<ErrorMessage error={new Error("ログが見つかりません")} />);
    }

    let detailJson: Record<string, unknown> = {};
    try {
      detailJson = JSON.parse(logEntry.detail);
    } catch {
      return c.render(<ErrorMessage error={new Error("ログの詳細解析に失敗しました")} />);
    }

    const errorCode = Number(detailJson.errorCode || 0);
    const threadKey = String(detailJson.threadKey || "");
    const name = String(detailJson.name || "");
    const mail = String(detailJson.mail || "");
    const content = String(detailJson.content || "");

    let postResult;
    if (errorCode === 1 || !threadKey) {
      postResult = await postThreadUsecase(
        { sql, logger },
        {
          threadTitleRaw: `復元投稿 ${new Date().toISOString()}`,
          authorNameRaw: name,
          mailRaw: mail,
          responseContentRaw: content,
          ipAddressRaw: logEntry.ipAddress,
          remoteHost: logEntry.ipAddress,
          userAgent: "",
          bypassNgword: true,
          bypassSpam: true,
        }
      );
    } else {
      postResult = await postResponseByThreadIdUsecase(
        { sql, logger },
        {
          threadIdRaw: threadKey,
          authorNameRaw: name,
          mailRaw: mail,
          responseContentRaw: content,
          ipAddressRaw: logEntry.ipAddress,
          bypassNgword: true,
          bypassSpam: true,
          bypassAttr: true,
          bypassCommand: true,
        }
      );
    }

    if (postResult.isErr()) {
      return c.render(<ErrorMessage error={postResult.error} />);
    }

    await deleteFailureLogUsecase({ sql, logger }, id);

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "失敗ログ許可投稿",
        detail: `障害ログ(ID: ${id})の投稿を許可しました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "delete" && typeof id === "string") {
    const result = await deleteFailureLogUsecase({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "失敗ログ削除",
        detail: `障害ログ(ID: ${id})を削除しました`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/failurelogs", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const logsResult = await getFailureLogsUsecase({ sql, logger });
  const logs: FailureLog[] = logsResult.isOk() ? logsResult.value : [];

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/plugins" className="text-purple-600 hover:underline">プラグイン管理</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/failurelogs" className="text-purple-600 hover:underline font-semibold">失敗ログ</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/groups" className="text-purple-600 hover:underline">グループ管理</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">失敗ログ管理</h1>

        {logs.length === 0 ? (
          <p className="text-gray-500">失敗ログはありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">日時</th>
                  <th className="p-2 text-left">エラーコード</th>
                  <th className="p-2 text-left">名前</th>
                  <th className="p-2 text-left">メール</th>
                  <th className="p-2 text-left">内容</th>
                  <th className="p-2 text-left">IP</th>
                  <th className="p-2 text-left">ホスト</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let detailJson: Record<string, unknown> = {};
                  try {
                    detailJson = JSON.parse(log.detail);
                  } catch { /* empty */ }
                  const errorCode = detailJson.errorCode ?? log.action;
                  const name = String(detailJson.name || "");
                  const mail = String(detailJson.mail || "");
                  const content = String(detailJson.content || "");
                  const threadKey = String(detailJson.threadKey || "");

                  return (
                    <tr key={log.id} className="border-t">
                      <td className="p-2 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                      <td className="p-2">
                        <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-1.5 py-0.5 rounded">
                          {String(errorCode)}
                        </span>
                      </td>
                      <td className="p-2 max-w-[100px] truncate">{name}</td>
                      <td className="p-2 max-w-[100px] truncate">{mail}</td>
                      <td className="p-2 max-w-[200px] truncate">{content}</td>
                      <td className="p-2 font-mono text-xs">{log.ipAddress}</td>
                      <td className="p-2 font-mono text-xs">{String(detailJson.threadKey || "")}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <form method="post" action="/admin/failurelogs" className="inline">
                            <input type="hidden" name="action" value="allowPost" />
                            <input type="hidden" name="id" value={log.id} />
                            <button
                              type="submit"
                              className="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                            >
                              許可して投稿
                            </button>
                          </form>
                          <form method="post" action="/admin/failurelogs" className="inline">
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="id" value={log.id} />
                            <button
                              type="submit"
                              className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                            >
                              削除
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
});