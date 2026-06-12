import { createRoute } from "honox/factory";

import { getBoardsUsecase, createBoardUsecase, updateBoardUsecase, deleteBoardUsecase } from "../../../src/board/usecases/manageBoardsUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("config.edit"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(<ErrorMessage error={new Error("DBに接続できませんでした")} />);
  }

  const body = await c.req.parseBody();
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "create") {
    const boardKey = typeof body.boardKey === "string" ? body.boardKey : "";
    const boardName = typeof body.boardName === "string" ? body.boardName : "";
    const subtitle = typeof body.subtitle === "string" ? body.subtitle : "";
    const localRule = typeof body.localRule === "string" ? body.localRule : "";
    const nanashiName = typeof body.nanashiName === "string" ? body.nanashiName : "名無しさん";
    const category = typeof body.category === "string" ? body.category : "";
    const sortOrder = parseInt(typeof body.sortOrder === "string" ? body.sortOrder : "0", 10) || 0;

    const result = await createBoardUsecase(
      { sql, logger },
      { boardKey, boardName, subtitle, localRule, nanashiName, category, sortOrder }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase({ sql, logger }, {
      action: "板作成",
      detail: `板キー: ${boardKey}, 板名: ${boardName}`,
      ipAddress: adminIp,
    });
  } else if (action === "update") {
    const id = typeof body.id === "string" ? body.id : "";
    const boardName = typeof body.boardName === "string" ? body.boardName : undefined;
    const subtitle = typeof body.subtitle === "string" ? body.subtitle : undefined;
    const localRule = typeof body.localRule === "string" ? body.localRule : undefined;
    const nanashiName = typeof body.nanashiName === "string" ? body.nanashiName : undefined;
    const category = typeof body.category === "string" ? body.category : undefined;
    const sortOrder = typeof body.sortOrder === "string" ? parseInt(body.sortOrder, 10) || 0 : undefined;
    const isActive = typeof body.isActive === "string" ? body.isActive === "on" : undefined;

    if (!id) {
      return c.render(<ErrorMessage error={new Error("板IDが指定されていません")} />);
    }

    const result = await updateBoardUsecase(
      { sql, logger },
      { id, boardName, subtitle, localRule, nanashiName, category, sortOrder, isActive }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase({ sql, logger }, {
      action: "板更新",
      detail: `板ID: ${id}, 板名: ${boardName || ""}`,
      ipAddress: adminIp,
    });
  } else if (action === "delete") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return c.render(<ErrorMessage error={new Error("板IDが指定されていません")} />);
    }

    const result = await deleteBoardUsecase({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase({ sql, logger }, {
      action: "板削除",
      detail: `板ID: ${id}`,
      ipAddress: adminIp,
    });
  }

  return c.redirect("/admin/boards", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(<ErrorMessage error={new Error("DBに接続できませんでした")} />);
  }

  const boardsResult = await getBoardsUsecase({ sql, logger }, true);
  if (boardsResult.isErr()) {
    return c.render(<ErrorMessage error={boardsResult.error} />);
  }

  const boards = boardsResult.value;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/boards" className="text-purple-600 hover:underline font-semibold">板管理</a>
          <a href="/admin/plugins" className="text-purple-600 hover:underline">プラグイン管理</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/responses" className="text-purple-600 hover:underline">レス管理</a>
          <a href="/admin/banners" className="text-purple-600 hover:underline">バナー管理</a>
          <a href="/admin/update" className="text-purple-600 hover:underline">アップデート確認</a>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">板管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">板一覧</h2>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">キー</th>
                <th className="p-2 text-left">板名</th>
                <th className="p-2 text-left">カテゴリ</th>
                <th className="p-2 text-left">表示順</th>
                <th className="p-2 text-left">ステータス</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {boards.map((board) => (
                <tr key={board.id} className="border-t">
                  <td className="p-2">{board.boardKey}</td>
                  <td className="p-2 font-semibold">{board.boardName}</td>
                  <td className="p-2">{board.category}</td>
                  <td className="p-2">{board.sortOrder}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${board.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {board.isActive ? "有効" : "無効"}
                    </span>
                  </td>
                  <td className="p-2">
                    <details className="inline-block">
                      <summary className="text-purple-600 hover:underline cursor-pointer text-sm">編集</summary>
                      <form method="post" action="/admin/boards" className="mt-2 flex flex-col gap-2 border p-3 rounded bg-gray-50">
                        <input type="hidden" name="action" value="update" />
                        <input type="hidden" name="id" value={board.id} />
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">板名:</label>
                          <input type="text" name="boardName" defaultValue={board.boardName} className="border rounded py-1 px-2 text-sm flex-1" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">サブタイトル:</label>
                          <input type="text" name="subtitle" defaultValue={board.subtitle} className="border rounded py-1 px-2 text-sm flex-1" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">ルール:</label>
                          <input type="text" name="localRule" defaultValue={board.localRule} className="border rounded py-1 px-2 text-sm flex-1" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">名無し名:</label>
                          <input type="text" name="nanashiName" defaultValue={board.nanashiName} className="border rounded py-1 px-2 text-sm flex-1" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">カテゴリ:</label>
                          <input type="text" name="category" defaultValue={board.category} className="border rounded py-1 px-2 text-sm flex-1" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">表示順:</label>
                          <input type="number" name="sortOrder" defaultValue={board.sortOrder} className="border rounded py-1 px-2 text-sm w-20" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs w-20">有効:</label>
                          <input type="checkbox" name="isActive" defaultChecked={board.isActive} className="h-4 w-4" />
                        </div>
                        <button type="submit" className="bg-purple-500 hover:bg-purple-700 text-white text-sm font-bold py-1 px-3 rounded">
                          更新
                        </button>
                      </form>
                    </details>
                    <form method="post" action="/admin/boards" className="inline-block ml-2">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={board.id} />
                      <button type="submit" className="text-red-600 hover:underline text-sm">削除</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">新規板作成</h2>
        <form method="post" action="/admin/boards" className="flex flex-col gap-3 max-w-lg">
          <input type="hidden" name="action" value="create" />
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">板キー (英数字)</label>
            <input type="text" name="boardKey" required pattern="[a-zA-Z0-9_]+" className="border border-gray-400 rounded py-2 px-3" />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">板名</label>
            <input type="text" name="boardName" required className="border border-gray-400 rounded py-2 px-3" />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">カテゴリ</label>
            <input type="text" name="category" className="border border-gray-400 rounded py-2 px-3" />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">サブタイトル</label>
            <input type="text" name="subtitle" className="border border-gray-400 rounded py-2 px-3" />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">ローカルルール</label>
            <input type="text" name="localRule" className="border border-gray-400 rounded py-2 px-3" />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">名無し名</label>
            <input type="text" name="nanashiName" value="名無しさん" className="border border-gray-400 rounded py-2 px-3" />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold mb-1">表示順</label>
            <input type="number" name="sortOrder" value="0" className="border border-gray-400 rounded py-2 px-3 w-24" />
          </div>
          <button type="submit" className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-40">
            作成
          </button>
        </form>
      </section>
    </main>
  );
});
