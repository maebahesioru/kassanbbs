import { createRoute } from "honox/factory";

import {
  rebuildIndexesUsecase,
  fixOrphanedResponsesUsecase,
} from "../../../src/rebuild/usecases/rebuildIndexesUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";

export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  if (action === "rebuild") {
    const result = await rebuildIndexesUsecase({ sql, logger });
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "インデックス再構築",
        detail: `スレッド数: ${result.value.threadsChecked}, レス数: ${result.value.responsesChecked}, 問題: ${result.value.issues.length}件`,
        ipAddress: adminIp,
      }
    );
    return c.redirect("/admin/rebuild", 303);
  }

  if (action === "fixOrphans") {
    const result = await fixOrphanedResponsesUsecase({ sql, logger });
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "孤児レスポンス削除",
        detail: `${result.value.deletedCount}件の孤児レスポンスを削除しました`,
        ipAddress: adminIp,
      }
    );
    return c.redirect("/admin/rebuild", 303);
  }

  return c.redirect("/admin/rebuild", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const result = await rebuildIndexesUsecase({ sql, logger });
  const data = result.isOk()
    ? result.value
    : { threadsChecked: 0, responsesChecked: 0, issues: [] };

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/rebuild" />

        <h1 className="text-2xl font-bold text-gray-800 mb-6">インデックス再構築</h1>

        {result.isErr() ? (
          <ErrorMessage error={result.error} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-semibold">スレッド数</p>
                <p className="text-2xl font-bold text-blue-800">{data.threadsChecked}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-semibold">レスポンス数</p>
                <p className="text-2xl font-bold text-green-800">{data.responsesChecked}</p>
              </div>
              <div className={`rounded-lg p-4 ${data.issues.length === 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`text-sm font-semibold ${data.issues.length === 0 ? "text-green-600" : "text-red-600"}`}>
                  問題
                </p>
                <p className={`text-2xl font-bold ${data.issues.length === 0 ? "text-green-800" : "text-red-800"}`}>
                  {data.issues.length}件
                </p>
              </div>
            </div>

            {data.issues.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">検出された問題</h2>
                <ul className="list-disc list-inside space-y-1 bg-red-50 p-4 rounded-lg">
                  {data.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-red-700">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4 mb-6">
              <form method="post" action="/admin/rebuild" className="inline">
                <input type="hidden" name="action" value="rebuild" />
                <button
                  type="submit"
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  インデックス再構築
                </button>
              </form>

              {data.issues.some((i) => i.includes("orphaned")) && (
                <form method="post" action="/admin/rebuild" className="inline">
                  <input type="hidden" name="action" value="fixOrphans" />
                  <button
                    type="submit"
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    孤児レスポンスを削除
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
});
