import { createRoute } from "honox/factory";

import {
  getNinpochoRecordsUsecase,
  getNinpochoConfigUsecase,
  resetNinpochoRecordUsecase,
  banNinpochoUserUsecase,
  unbanNinpochoUserUsecase,
  updateNinpochoConfigUsecase,
} from "../../../src/ninpocho/usecases/manageNinpochoUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { ReadNinpochoRecord } from "../../../src/ninpocho/domain/read/ReadNinpochoRecord";
import type { ReadNinpochoConfig } from "../../../src/ninpocho/domain/read/ReadNinpochoConfig";

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
    const result = await resetNinpochoRecordUsecase({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "忍法帖記録リセット",
        detail: `忍法帖記録(ID: ${id})をリセットしました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "ban") {
    const hashId = body.hashId;
    const ipAddress = body.ipAddress;
    const banDurationHours = body.banDurationHours;

    if (
      typeof hashId !== "string" ||
      typeof ipAddress !== "string" ||
      typeof banDurationHours !== "string"
    ) {
      return c.render(
        <ErrorMessage error={new Error("必要な項目を入力してください")} />
      );
    }

    const result = await banNinpochoUserUsecase(
      { sql, logger },
      {
        hashId: hashId.trim(),
        ipAddress: ipAddress.trim(),
        banDurationHours: Number(banDurationHours),
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "忍法帖手動BAN",
        detail: `忍法帖手動BAN: ${hashId.trim()} (${banDurationHours}時間)`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "unban") {
    const hashId = body.hashId;
    if (typeof hashId !== "string") {
      return c.render(
        <ErrorMessage error={new Error("解除するユーザーが指定されていません")} />
      );
    }
    const result = await unbanNinpochoUserUsecase(
      { sql, logger },
      hashId.trim()
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "忍法帖BAN解除",
        detail: `忍法帖BAN解除: ${hashId.trim()}`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "updateConfig") {
    const enabled = body.enabled;
    const errorThreshold1 = body.errorThreshold1;
    const banDuration1Hours = body.banDuration1Hours;
    const errorThreshold2 = body.errorThreshold2;
    const banDuration2Hours = body.banDuration2Hours;
    const errorThreshold3 = body.errorThreshold3;
    const banDuration3Hours = body.banDuration3Hours;
    const permanentBanThreshold = body.permanentBanThreshold;
    const errorDecayHours = body.errorDecayHours;
    const forceSageLevel = body.forceSageLevel;
    const forceKoteName = body.forceKoteName;

    const configParams: Record<string, unknown> = {};

    if (enabled === "on") {
      configParams.enabled = true;
    } else if (enabled === "off") {
      configParams.enabled = false;
    }

    if (typeof errorThreshold1 === "string" && errorThreshold1 !== "") {
      configParams.errorThreshold1 = Number(errorThreshold1);
    }
    if (typeof banDuration1Hours === "string" && banDuration1Hours !== "") {
      configParams.banDuration1Hours = Number(banDuration1Hours);
    }
    if (typeof errorThreshold2 === "string" && errorThreshold2 !== "") {
      configParams.errorThreshold2 = Number(errorThreshold2);
    }
    if (typeof banDuration2Hours === "string" && banDuration2Hours !== "") {
      configParams.banDuration2Hours = Number(banDuration2Hours);
    }
    if (typeof errorThreshold3 === "string" && errorThreshold3 !== "") {
      configParams.errorThreshold3 = Number(errorThreshold3);
    }
    if (typeof banDuration3Hours === "string" && banDuration3Hours !== "") {
      configParams.banDuration3Hours = Number(banDuration3Hours);
    }
    if (typeof permanentBanThreshold === "string" && permanentBanThreshold !== "") {
      configParams.permanentBanThreshold = Number(permanentBanThreshold);
    }
    if (typeof errorDecayHours === "string" && errorDecayHours !== "") {
      configParams.errorDecayHours = Number(errorDecayHours);
    }
    if (typeof forceSageLevel === "string" && forceSageLevel !== "") {
      configParams.forceSageLevel = Number(forceSageLevel);
    }
    if (typeof forceKoteName === "string" && forceKoteName !== "") {
      configParams.forceKoteName = forceKoteName;
    }

    const result = await updateNinpochoConfigUsecase(
      { sql, logger },
      configParams as any
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "忍法帖設定更新",
        detail: "忍法帖設定を更新しました",
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/ninpocho", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const recordsResult = await getNinpochoRecordsUsecase({ sql, logger });
  const records: ReadNinpochoRecord[] = recordsResult.isOk()
    ? recordsResult.value
    : [];

  const configResult = await getNinpochoConfigUsecase({ sql, logger });
  const config: ReadNinpochoConfig | null = configResult.isOk()
    ? configResult.value
    : null;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <AdminNav currentPath="/admin/ninpocho" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">忍法帖管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          忍法帖設定
        </h2>
        <form
          method="post"
          action="/admin/ninpocho"
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
                エラーしきい値1（警告）
              </label>
              <input
                type="number"
                name="errorThreshold1"
                value={config?.val.errorThreshold1 ?? 3}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                BAN時間1（時間）
              </label>
              <input
                type="number"
                name="banDuration1Hours"
                value={config?.val.banDuration1Hours ?? 1}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                エラーしきい値2
              </label>
              <input
                type="number"
                name="errorThreshold2"
                value={config?.val.errorThreshold2 ?? 5}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                BAN時間2（時間）
              </label>
              <input
                type="number"
                name="banDuration2Hours"
                value={config?.val.banDuration2Hours ?? 24}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                エラーしきい値3
              </label>
              <input
                type="number"
                name="errorThreshold3"
                value={config?.val.errorThreshold3 ?? 10}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                BAN時間3（時間）
              </label>
              <input
                type="number"
                name="banDuration3Hours"
                value={config?.val.banDuration3Hours ?? 168}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                永久BANしきい値
              </label>
              <input
                type="number"
                name="permanentBanThreshold"
                value={config?.val.permanentBanThreshold ?? 20}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                エラー減衰時間（時間）
              </label>
              <input
                type="number"
                name="errorDecayHours"
                value={config?.val.errorDecayHours ?? 72}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                Force sageレベル
              </label>
              <input
                type="number"
                name="forceSageLevel"
                value={config?.val.forceSageLevel ?? 0}
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-700 text-sm font-bold mb-1">
                Force kote名前
              </label>
              <input
                type="text"
                name="forceKoteName"
                value={config?.val.forceKoteName ?? ""}
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
          手動BAN
        </h2>
        <form
          method="post"
          action="/admin/ninpocho"
          className="w-full mb-8"
        >
          <input type="hidden" name="action" value="ban" />
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                name="hashId"
                placeholder="ハッシュID"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <input
                type="text"
                name="ipAddress"
                placeholder="IPアドレス"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <input
                type="number"
                name="banDurationHours"
                placeholder="BAN時間（時間）"
                className="border border-gray-400 rounded py-2 px-3 w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <button
                type="submit"
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-nowrap"
              >
                BAN
              </button>
            </div>
          </div>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          忍法帖記録一覧
        </h2>
        {records.length === 0 ? (
          <p className="text-gray-500">忍法帖記録はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">ハッシュID</th>
                  <th className="p-2 text-left">IPアドレス</th>
                  <th className="p-2 text-left">エラー数</th>
                  <th className="p-2 text-left">BANレベル</th>
                  <th className="p-2 text-left">BAN期限</th>
                  <th className="p-2 text-left">最終エラー</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: ReadNinpochoRecord) => (
                  <tr key={r.val.id} className="border-t">
                    <td className="p-2 font-mono text-xs">
                      {r.val.hashId}
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {r.val.ipAddress}
                    </td>
                    <td className="p-2">{r.val.errorCount}</td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          r.val.banLevel >= 4
                            ? "bg-red-200 text-red-800"
                            : r.val.banLevel >= 1
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {r.val.banLevel >= 4
                          ? "永久"
                          : r.val.banLevel >= 1
                            ? `レベル${r.val.banLevel}`
                            : "なし"}
                      </span>
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {r.val.banUntil
                        ? r.val.banUntil.toLocaleString("ja-JP")
                        : "-"}
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {r.val.lastErrorAt
                        ? r.val.lastErrorAt.toLocaleString("ja-JP")
                        : "-"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <form
                          method="post"
                          action="/admin/ninpocho"
                          className="inline"
                        >
                          <input
                            type="hidden"
                            name="action"
                            value="unban"
                          />
                          <input
                            type="hidden"
                            name="hashId"
                            value={r.val.hashId}
                          />
                          <button
                            type="submit"
                            className="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                          >
                            解除
                          </button>
                        </form>
                        <form
                          method="post"
                          action="/admin/ninpocho"
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
