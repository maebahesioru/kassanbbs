import { createRoute } from "honox/factory";

import { checkUpdateUsecase } from "../../../src/update/usecases/checkUpdateUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";

export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const result = await checkUpdateUsecase({ sql, logger });
  if (result.isErr()) {
    return c.render(<ErrorMessage error={result.error} />);
  }

  const adminIp = getIpAddress(c);
  await addAdminLogUsecase(
    { sql, logger },
    {
      action: "アップデート確認",
      detail: result.value?.result?.hasUpdate
        ? `新しいバージョン ${result.value.result.latestVersion} が利用可能です`
        : "最新バージョンです",
      ipAddress: adminIp,
    }
  );

  return c.redirect("/admin/update", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const configRows = await sql<{ last_update_check: Date | null; update_available: string | null }[]>`
    SELECT last_update_check, update_available FROM config LIMIT 1
  `;
  const configRow = configRows?.[0];

  let updateResult: { result: { hasUpdate: boolean; latestVersion: string; currentVersion: string; releaseUrl: string } | null; checkedAt: Date } | null = null;

  if (configRow?.update_available) {
    try {
      const parsed = JSON.parse(configRow.update_available);
      updateResult = {
        result: parsed,
        checkedAt: configRow.last_update_check ? new Date(configRow.last_update_check) : new Date(),
      };
    } catch {
      // invalid JSON, ignore
    }
  } else if (configRow?.last_update_check) {
    updateResult = {
      result: null,
      checkedAt: new Date(configRow.last_update_check),
    };
  }

  const lastCheckTime = configRow?.last_update_check ? new Date(configRow.last_update_check).getTime() : 0;
  const needsAutoCheck = !lastCheckTime || (Date.now() - lastCheckTime) > 24 * 60 * 60 * 1000;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/banners" className="text-purple-600 hover:underline">バナー管理</a>
          <a href="/admin/rebuild" className="text-purple-600 hover:underline">インデックス再構築</a>
          <a href="/admin/update" className="text-purple-600 hover:underline font-semibold">アップデート確認</a>
          <a href="/admin/federation" className="text-purple-600 hover:underline">連合設定</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
        </nav>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">アップデート確認</h1>

        {needsAutoCheck && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              前回の確認から24時間以上経過しています。
            </p>
            <form method="post" action="/admin/update" className="mt-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded focus:outline-none"
              >
                アップデートを確認
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-semibold mb-1">現在のバージョン</p>
            <p className="text-xl font-bold text-gray-800">v1.0.0</p>
          </div>
          {updateResult ? (
            <div className={`rounded-lg p-4 ${updateResult.result ? (updateResult.result.hasUpdate ? "bg-yellow-50" : "bg-green-50") : "bg-gray-50"}`}>
              <p className="text-sm font-semibold mb-1">
                {updateResult.result
                  ? updateResult.result.hasUpdate
                    ? "最新バージョン"
                    : "状態"
                  : "状態"}
              </p>
              {updateResult.result ? (
                updateResult.result.hasUpdate ? (
                  <>
                    <p className="text-xl font-bold text-yellow-800">
                      {updateResult.result.latestVersion}
                    </p>
                    <a
                      href={updateResult.result.releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm mt-1 inline-block"
                    >
                      リリースページを開く
                    </a>
                  </>
                ) : (
                  <p className="text-xl font-bold text-green-800">最新バージョンです</p>
                )
              ) : (
                <p className="text-lg text-gray-600">情報を取得できませんでした</p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 font-semibold mb-1">状態</p>
              <p className="text-lg text-gray-500">確認ボタンを押してください</p>
            </div>
          )}
        </div>

        {updateResult?.checkedAt && (
          <p className="text-sm text-gray-500 mb-6">
            最終確認日時: {updateResult.checkedAt.toLocaleString("ja-JP")}
          </p>
        )}

        <form method="post" action="/admin/update">
          <button
            type="submit"
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            アップデートを確認
          </button>
        </form>
      </section>
    </main>
  );
});
