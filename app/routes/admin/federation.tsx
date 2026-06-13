import { createRoute } from "honox/factory";

import {
  getFederationConfigRepository,
  updateFederationConfigRepository,
  type FederationConfig,
} from "../../../src/federation/repositories/getFederationConfigRepository";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

export const POST = createRoute(
  requirePermission("config.edit"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  const configResult = await getFederationConfigRepository({ sql, logger });
  if (configResult.isErr()) {
    return c.render(<ErrorMessage error={configResult.error} />);
  }

  const config = configResult.value;

  if (action === "toggle") {
    config.enabled = !config.enabled;
  } else if (action === "addServer") {
    const server = body.server;
    if (typeof server === "string" && server.trim().length > 0) {
      config.remoteServers = [...config.remoteServers, server.trim()];
    }
  } else if (action === "removeServer") {
    const server = body.server;
    if (typeof server === "string") {
      config.remoteServers = config.remoteServers.filter((s) => s !== server);
    }
  } else if (action === "addBoard") {
    const board = body.board;
    if (typeof board === "string" && board.trim().length > 0) {
      config.sharedBoards = [...config.sharedBoards, board.trim()];
    }
  } else if (action === "removeBoard") {
    const board = body.board;
    if (typeof board === "string") {
      config.sharedBoards = config.sharedBoards.filter((b) => b !== board);
    }
  }

  const updateResult = await updateFederationConfigRepository(
    { sql, logger },
    config
  );
  if (updateResult.isErr()) {
    return c.render(<ErrorMessage error={updateResult.error} />);
  }

  const adminIp = getIpAddress(c);
  await addAdminLogUsecase(
    { sql, logger },
    {
      action: "連合設定更新",
      detail: `有効: ${config.enabled}, サーバー数: ${config.remoteServers.length}, 共有板数: ${config.sharedBoards.length}`,
      ipAddress: adminIp,
    }
  );

  return c.redirect("/admin/federation", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const configResult = await getFederationConfigRepository({ sql, logger });
  const config: FederationConfig = configResult.isOk()
    ? configResult.value
    : { enabled: false, remoteServers: [], sharedBoards: [] };

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/federation" />

        <h1 className="text-2xl font-bold text-gray-800 mb-6">連合設定</h1>

        <div className="mb-6 flex items-center gap-4">
          <form method="post" action="/admin/federation" className="inline">
            <input type="hidden" name="action" value="toggle" />
            <button
              type="submit"
              className={`font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                config.enabled
                  ? "bg-green-500 hover:bg-green-700 text-white"
                  : "bg-gray-300 hover:bg-gray-400 text-gray-800"
              }`}
            >
              連合: {config.enabled ? "有効" : "無効"}
            </button>
          </form>
          {config.enabled && (
            <span className="text-sm text-green-600">連合機能は有効です</span>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">リモートサーバー</h2>
        <form method="post" action="/admin/federation" className="w-full mb-6">
          <input type="hidden" name="action" value="addServer" />
          <div className="flex gap-2">
            <input
              type="text"
              name="server"
              placeholder="https://example.com"
              className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              追加
            </button>
          </div>
        </form>

        {config.remoteServers.length === 0 ? (
          <p className="text-gray-500 mb-6">リモートサーバーは登録されていません。</p>
        ) : (
          <ul className="space-y-2 mb-6">
            {config.remoteServers.map((server) => (
              <li
                key={server}
                className="flex items-center justify-between bg-gray-50 p-3 rounded"
              >
                <span className="text-sm">{server}</span>
                <form method="post" action="/admin/federation" className="inline">
                  <input type="hidden" name="action" value="removeServer" />
                  <input type="hidden" name="server" value={server} />
                  <button
                    type="submit"
                    className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded"
                  >
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <h2 className="text-xl font-semibold text-gray-700 mb-4">共有ボード</h2>
        <form method="post" action="/admin/federation" className="w-full mb-6">
          <input type="hidden" name="action" value="addBoard" />
          <div className="flex gap-2">
            <input
              type="text"
              name="board"
              placeholder="ボード名"
              className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              追加
            </button>
          </div>
        </form>

        {config.sharedBoards.length === 0 ? (
          <p className="text-gray-500">共有ボードは登録されていません。</p>
        ) : (
          <ul className="space-y-2">
            {config.sharedBoards.map((board) => (
              <li
                key={board}
                className="flex items-center justify-between bg-gray-50 p-3 rounded"
              >
                <span className="text-sm">{board}</span>
                <form method="post" action="/admin/federation" className="inline">
                  <input type="hidden" name="action" value="removeBoard" />
                  <input type="hidden" name="board" value={board} />
                  <button
                    type="submit"
                    className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded"
                  >
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
});
