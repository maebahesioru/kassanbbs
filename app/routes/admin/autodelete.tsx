import { createRoute } from "honox/factory";

import { getAutoDeleteConfigRepository } from "../../../src/autodelete/repositories/getAutoDeleteConfigRepository";
import { updateAutoDeleteConfigRepository } from "../../../src/autodelete/repositories/updateAutoDeleteConfigRepository";
import { autoDeleteUsecase } from "../../../src/autodelete/usecases/autoDeleteUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

export const POST = createRoute(
  requirePermission("autodelete.manage"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  if (action === "run") {
    const deleteResult = await autoDeleteUsecase({ sql, logger });
    if (deleteResult.isErr()) {
      return c.render(<ErrorMessage error={deleteResult.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "自動削除実行",
        detail: `${deleteResult.value}件のスレッドを削除しました`,
        ipAddress: adminIp,
      }
    );

    return c.redirect("/admin/autodelete", 303);
  }

  const enabled = body.enabled === "on" || body.enabled === "true";
  const deleteAfterDaysRaw = body.deleteAfterDays;
  const onlyIfStopped = body.onlyIfStopped === "on" || body.onlyIfStopped === "true";
  const onlyIfNoResponsesDaysRaw = body.onlyIfNoResponsesDays;

  if (typeof deleteAfterDaysRaw !== "string" || typeof onlyIfNoResponsesDaysRaw !== "string") {
    return c.render(
      <ErrorMessage error={new Error("すべての項目を入力してください")} />
    );
  }

  const deleteAfterDays = parseInt(deleteAfterDaysRaw, 10);
  const onlyIfNoResponsesDays = parseInt(onlyIfNoResponsesDaysRaw, 10);

  if (isNaN(deleteAfterDays) || isNaN(onlyIfNoResponsesDays)) {
    return c.render(
      <ErrorMessage error={new Error("日数には数値を入力してください")} />
    );
  }

  const updateResult = await updateAutoDeleteConfigRepository(
    { sql, logger },
    {
      enabled,
      deleteAfterDays,
      onlyIfStopped,
      onlyIfNoResponsesDays,
    }
  );

  if (updateResult.isErr()) {
    return c.render(<ErrorMessage error={updateResult.error} />);
  }

  const adminIp = getIpAddress(c);
  await addAdminLogUsecase(
    { sql, logger },
    {
      action: "自動削除設定更新",
      detail: `有効: ${enabled}, 削除日数: ${deleteAfterDays}, 停止中のみ: ${onlyIfStopped}, 無応答日数: ${onlyIfNoResponsesDays}`,
      ipAddress: adminIp,
    }
  );

  return c.redirect("/admin/autodelete", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const configResult = await getAutoDeleteConfigRepository({ sql, logger });
  if (configResult.isErr()) {
    return c.render(<ErrorMessage error={configResult.error} />);
  }

  const config = configResult.value;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-10">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/groups" className="text-purple-600 hover:underline">グループ管理</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
          <a href="/admin/autodelete" className="text-purple-600 hover:underline font-semibold">自動削除設定</a>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">自動削除設定</h1>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">
            削除済みスレッド数: <span className="font-bold text-purple-600">{config.deletedCount}</span>
          </p>
        </div>

        <form method="post" action="/admin/autodelete" className="w-full">
          <input type="hidden" name="action" value="config" />
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={config.enabled}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="text-gray-700 text-sm font-bold">
                自動削除を有効にする
              </label>
            </div>
            <div className="flex flex-col">
              <label htmlFor="deleteAfterDays" className="text-gray-700 text-sm font-bold mb-1">
                削除までの日数
              </label>
              <input
                type="number"
                id="deleteAfterDays"
                name="deleteAfterDays"
                value={config.deleteAfterDays}
                min="1"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="onlyIfStopped"
                name="onlyIfStopped"
                checked={config.onlyIfStopped}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="onlyIfStopped" className="text-gray-700 text-sm font-bold">
                停止中のスレッドのみ削除する
              </label>
            </div>
            <div className="flex flex-col">
              <label htmlFor="onlyIfNoResponsesDays" className="text-gray-700 text-sm font-bold mb-1">
                最終レスからの経過日数 (0で無効)
              </label>
              <input
                type="number"
                id="onlyIfNoResponsesDays"
                name="onlyIfNoResponsesDays"
                value={config.onlyIfNoResponsesDays}
                min="0"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="submit"
              className="w-60 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              設定を保存
            </button>
          </div>
        </form>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">手動実行</h2>
          <p className="text-gray-600 mb-4">
            現在の設定で自動削除を即時実行します。削除されたスレッド数は上記のカウンターに加算されます。
          </p>
          <form method="post" action="/admin/autodelete">
            <input type="hidden" name="action" value="run" />
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              自動削除を今すぐ実行
            </button>
          </form>
        </div>
      </section>
    </main>
  );
});
