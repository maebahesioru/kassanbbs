import { createRoute } from "honox/factory";
import { uuidv7 } from "uuidv7";

import { getIpRestrictionsRepository } from "../../../src/access/repositories/getIpRestrictionsRepository";
import { addIpRestrictionRepository } from "../../../src/access/repositories/addIpRestrictionRepository";
import { deleteIpRestrictionRepository } from "../../../src/access/repositories/deleteIpRestrictionRepository";
import { getUserEntriesRepository } from "../../../src/user/repositories/getUserEntriesRepository";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { IpRestriction } from "../../../src/access/repositories/getIpRestrictionsRepository";
import type { ReadUserEntry } from "../../../src/user/domain/read/ReadUserEntry";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("iprestrictions.manage"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  if (action === "add") {
    const ipOrCidr = body.ipOrCidr;
    const restrictionType = body.restrictionType;
    const note = body.note;
    const hostPattern = typeof body.hostPattern === "string" ? body.hostPattern.trim() : "";
    const uaPattern = typeof body.uaPattern === "string" ? body.uaPattern.trim() : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const expiresAt = typeof body.expiresAt === "string" && body.expiresAt.trim() !== "" ? body.expiresAt.trim() : null;
    const denyMethod = typeof body.denyMethod === "string" ? body.denyMethod : "host";
    const ipRangeEnd = typeof body.ipRangeEnd === "string" ? body.ipRangeEnd.trim() : "";
    const ipVersion = typeof body.ipVersion === "string" ? parseInt(body.ipVersion, 10) : 4;

    if (
      typeof ipOrCidr !== "string" ||
      ipOrCidr.trim().length === 0 ||
      (restrictionType !== "deny" && restrictionType !== "allow")
    ) {
      return c.render(
        <ErrorMessage error={new Error("IPアドレスと種別を正しく入力してください")} />
      );
    }

    const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(\/\d{1,3})?$/;
    const trimmed = ipOrCidr.trim();
    if (ipVersion === 4 && !ipv4CidrRegex.test(trimmed)) {
      return c.render(
        <ErrorMessage error={new Error("IPv4アドレスまたはCIDRの形式が正しくありません")} />
      );
    }
    if (ipVersion === 6 && !ipv6Regex.test(trimmed)) {
      return c.render(
        <ErrorMessage error={new Error("IPv6アドレスの形式が正しくありません")} />
      );
    }

    const id = uuidv7();
    const adminIp = getIpAddress(c);

    try {
      await sql`
        INSERT INTO ip_restrictions(id, ip_or_cidr, restriction_type, note, host_pattern, ua_pattern, session_id, expires_at, deny_method, ip_range_end, ip_version)
        VALUES(${id}::uuid, ${ipOrCidr.trim()}, ${restrictionType}, ${typeof note === "string" ? note.trim() : ""}, ${hostPattern || null}, ${uaPattern || null}, ${sessionId || null}, ${expiresAt ? new Date(expiresAt) : null}, ${denyMethod}, ${ipRangeEnd || null}, ${ipVersion})
      `;
    } catch (error) {
      return c.render(<ErrorMessage error={error instanceof Error ? error : new Error("追加に失敗しました")} />);
    }

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "アクセス制限追加",
        detail: `アクセス制限を追加しました: ${ipOrCidr.trim()} (${restrictionType})`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "delete") {
    const id = body.id;
    if (typeof id !== "string") {
      return c.render(
        <ErrorMessage error={new Error("削除するIP制限が指定されていません")} />
      );
    }
    const result = await deleteIpRestrictionRepository({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "IP制限削除",
        detail: `IP制限(ID: ${id})を削除しました`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/iprestrictions", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const restrictionsResult = await getIpRestrictionsRepository({ sql, logger });
  const restrictions: IpRestriction[] = restrictionsResult.isOk() ? restrictionsResult.value : [];
  const userEntriesResult = await getUserEntriesRepository({ sql, logger });
  const userEntries: ReadUserEntry[] = userEntriesResult.isOk() ? userEntriesResult.value : [];

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/iprestrictions" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">IP制限管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">アクセス制限追加</h2>
        <form method="post" action="/admin/iprestrictions" className="w-full mb-8">
          <input type="hidden" name="action" value="add" />
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                name="ipOrCidr"
                placeholder="IP/CIDR/IPv6 (例: 192.168.1.1 または 10.0.0.0/8)"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                name="restrictionType"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="deny">拒否</option>
                <option value="allow">許可</option>
              </select>
              <select
                name="ipVersion"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="4">IPv4</option>
                <option value="6">IPv6</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                name="ipRangeEnd"
                placeholder="IP範囲終端 (例: 192.168.1.255)"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                name="denyMethod"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="host">host (アクセス拒否)</option>
                <option value="disable">disable (書き込み不可)</option>
                <option value="tate">tate (スレッド作成不可)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                name="hostPattern"
                placeholder="ホスト名正規表現 (例: \.example\.com$)"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                name="uaPattern"
                placeholder="UA正規表現 (例: curl|wget)"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                name="sessionId"
                placeholder="セッションID"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="datetime-local"
                name="expiresAt"
                placeholder="有効期限"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                name="note"
                placeholder="備考 (任意)"
                className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-nowrap"
              >
                追加
              </button>
            </div>
          </div>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">アクセス制限一覧</h2>
        {userEntries.length === 0 ? (
          <p className="text-gray-500">アクセス制限は登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">IP/CIDR</th>
                  <th className="p-2 text-left">範囲</th>
                  <th className="p-2 text-left">種別</th>
                  <th className="p-2 text-left">方法</th>
                  <th className="p-2 text-left">ホスト/UA/Session</th>
                  <th className="p-2 text-left">有効期限</th>
                  <th className="p-2 text-left">備考</th>
                  <th className="p-2 text-left">登録日時</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {userEntries.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.ipOrCidr || "-"}</td>
                    <td className="p-2 font-mono text-xs">{r.ipRangeEnd || "-"}</td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          r.restrictionType === "deny"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {r.restrictionType === "deny" ? "拒否" : "許可"}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{r.denyMethod}</td>
                    <td className="p-2 text-xs max-w-xs truncate">
                      <span title={`ホスト: ${r.hostPattern}\nUA: ${r.uaPattern}\nSession: ${r.sessionId}`}>
                        {[r.hostPattern, r.uaPattern, r.sessionId].filter(Boolean).join(", ") || "-"}
                      </span>
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {r.expiresAt ? r.expiresAt.toLocaleString("ja-JP") : "-"}
                    </td>
                    <td className="p-2 text-gray-600 max-w-xs truncate">{r.note || "-"}</td>
                    <td className="p-2 text-gray-500 text-xs whitespace-nowrap">
                      {r.createdAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="p-2">
                      <form method="post" action="/admin/iprestrictions" className="inline">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                        >
                          削除
                        </button>
                      </form>
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
