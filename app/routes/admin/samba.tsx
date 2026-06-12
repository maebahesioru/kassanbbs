import { createRoute } from "honox/factory";

import {
  getSambaRecordsUsecase,
  getSambaConfigUsecase,
  resetSambaRecordUsecase,
  updateSambaConfigUsecase,
} from "../../../src/samba/usecases/manageSambaUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { ReadSambaTracking } from "../../../src/samba/domain/read/ReadSambaTracking";
import type { ReadSambaConfig } from "../../../src/samba/domain/read/ReadSambaConfig";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("ninpocho.manage"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;
  const adminIp = getIpAddress(c);

  if (action === "reset") {
    const id = body.id;
    if (typeof id !== "string") {
      return c.render(
        <ErrorMessage error={new Error("リセットするレコードが指定されていません")} />
      );
    }
    const result = await resetSambaRecordUsecase({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "サンバ記録リセット",
        detail: `サンバ記録(ID: ${id})をリセットしました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "updateConfig") {
    const enabled = body.enabled;
    const cautionThreshold = body.cautionThreshold;
    const warningThreshold = body.warningThreshold;
    const listedThreshold = body.listedThreshold;
    const banDurationHours = body.banDurationHours;
    const liveModeMultiplier = body.liveModeMultiplier;
    const violationDecayHours = body.violationDecayHours;

    const configParams: Record<string, unknown> = {};

    if (enabled === "on") {
      configParams.enabled = true;
    } else if (enabled === "off") {
      configParams.enabled = false;
    }

    if (typeof cautionThreshold === "string" && cautionThreshold !== "") {
      configParams.cautionThreshold = Number(cautionThreshold);
    }
    if (typeof warningThreshold === "string" && warningThreshold !== "") {
      configParams.warningThreshold = Number(warningThreshold);
    }
    if (typeof listedThreshold === "string" && listedThreshold !== "") {
      configParams.listedThreshold = Number(listedThreshold);
    }
    if (typeof banDurationHours === "string" && banDurationHours !== "") {
      configParams.banDurationHours = Number(banDurationHours);
    }
    if (typeof liveModeMultiplier === "string" && liveModeMultiplier !== "") {
      configParams.liveModeMultiplier = Number(liveModeMultiplier);
    }
    if (typeof violationDecayHours === "string" && violationDecayHours !== "") {
      configParams.violationDecayHours = Number(violationDecayHours);
    }

    const result = await updateSambaConfigUsecase(
      { sql, logger },
      configParams as any
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "サンバ設定更新",
        detail: "サンバ設定を更新しました",
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/samba", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const recordsResult = await getSambaRecordsUsecase({ sql, logger });
  const records: ReadSambaTracking[] = recordsResult.isOk()
    ? recordsResult.value
    : [];

  const configResult = await getSambaConfigUsecase({ sql, logger });
  const config: ReadSambaConfig | null = configResult.isOk()
    ? configResult.value
    : null;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">
            基本設定
          </a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">
            NGワード
          </a>
          <a
            href="/admin/iprestrictions"
            className="text-purple-600 hover:underline"
          >
            IP制限
          </a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">
            スレッド管理
          </a>
          <a href="/admin/users" className="text-purple-600 hover:underline">
            ユーザー管理
          </a>
          <a href="/admin/groups" className="text-purple-600 hover:underline">
            グループ管理
          </a>
          <a
            href="/admin/ninpocho"
            className="text-purple-600 hover:underline"
          >
            忍法帖管理
          </a>
          <a
            href="/admin/samba"
            className="text-purple-600 hover:underline font-semibold"
          >
            サンバ管理
          </a>
          <a
            href="/admin/banners"
            className="text-purple-600 hover:underline"
          >
            バナー管理
          </a>
          <a
            href="/admin/notices"
            className="text-purple-600 hover:underline"
          >
            お知らせ管理
          </a>
          <a
            href="/admin/rebuild"
            className="text-purple-600 hover:underline"
          >
            インデックス再構築
          </a>
          <a
            href="/admin/update"
            className="text-purple-600 hover:underline"
          >
            アップデート確認
          </a>
          <a
            href="/admin/federation"
            className="text-purple-600 hover:underline"
          >
            連合設定
          </a>
          <a
            href="/admin/password"
            className="text-purple-600 hover:underline"
          >
            パスワード変更
          </a>
          <a
            href="/admin/autodelete"
            className="text-purple-600 hover:underline"
          >
            自動削除設定
          </a>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">サンバ管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          サンバ設定
        </h2>
        <form
          method="post"
          action="/admin/samba"
          className="w-full mb-8"
        >
          <input type="hidden" name="action" value="updateConfig" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                有効
              </label>
              <select
                name="enabled"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option
                  value="on"
                  selected={config?.val.enabled === true}
                >
                  有効
                </option>
                <option
                  value="off"
                  selected={config?.val.enabled === false}
                >
                  無効
                </option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                注意しきい値
              </label>
              <input
                type="number"
                name="cautionThreshold"
                value={config?.val.cautionThreshold ?? 3}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                警告しきい値
              </label>
              <input
                type="number"
                name="warningThreshold"
                value={config?.val.warningThreshold ?? 6}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                規制しきい値
              </label>
              <input
                type="number"
                name="listedThreshold"
                value={config?.val.listedThreshold ?? 10}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                BAN時間（時間）
              </label>
              <input
                type="number"
                name="banDurationHours"
                value={config?.val.banDurationHours ?? 24}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                実況モード倍率
              </label>
              <input
                type="number"
                step="0.1"
                name="liveModeMultiplier"
                value={config?.val.liveModeMultiplier ?? 0.5}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                違反減衰時間（時間）
              </label>
              <input
                type="number"
                name="violationDecayHours"
                value={config?.val.violationDecayHours ?? 72}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              設定を更新
            </button>
          </div>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          サンバ追跡記録一覧
        </h2>
        {records.length === 0 ? (
          <p className="text-gray-500">サンバ追跡記録はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">ホスト識別子</th>
                  <th className="p-2 text-left">違反回数</th>
                  <th className="p-2 text-left">現在レベル</th>
                  <th className="p-2 text-left">BAN期限</th>
                  <th className="p-2 text-left">最終違反</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: ReadSambaTracking) => (
                  <tr key={r.val.id} className="border-t">
                    <td className="p-2 font-mono text-xs">
                      {r.val.hostIdentifier}
                    </td>
                    <td className="p-2">{r.val.violationCount}</td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          r.val.currentLevel === "banned"
                            ? "bg-red-200 text-red-800"
                            : r.val.currentLevel === "listed"
                              ? "bg-orange-200 text-orange-800"
                              : r.val.currentLevel === "warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : r.val.currentLevel === "caution"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                        }`}
                      >
                        {r.val.currentLevel === "banned"
                          ? "BAN"
                          : r.val.currentLevel === "listed"
                            ? "規制中"
                            : r.val.currentLevel === "warning"
                              ? "警告"
                              : r.val.currentLevel === "caution"
                                ? "注意"
                                : "なし"}
                      </span>
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {r.val.banUntil
                        ? r.val.banUntil.toLocaleString("ja-JP")
                        : "-"}
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {r.val.lastViolationAt
                        ? r.val.lastViolationAt.toLocaleString("ja-JP")
                        : "-"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <form
                          method="post"
                          action="/admin/samba"
                          className="inline"
                        >
                          <input
                            type="hidden"
                            name="action"
                            value="reset"
                          />
                          <input
                            type="hidden"
                            name="id"
                            value={r.val.id}
                          />
                          <button
                            type="submit"
                            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                          >
                            リセット
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
});
