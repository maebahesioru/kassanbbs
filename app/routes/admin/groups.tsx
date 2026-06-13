import { createRoute } from "honox/factory";

import {
  getAdminGroupsUsecase,
  createAdminGroupUsecase,
  updateAdminGroupUsecase,
  deleteAdminGroupUsecase,
} from "../../../src/cap/usecases/manageGroupsUsecase";
import { AVAILABLE_PERMISSIONS } from "../../../src/cap/services/permissionService";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { AdminGroup } from "../../../src/cap/repositories/getAdminGroupsRepository";

const PERMISSION_LABELS: Record<string, string> = {
  "config.edit": "設定編集",
  "config.password": "パスワード変更",
  "users.manage": "ユーザー管理",
  "groups.manage": "グループ管理",
  "threads.stop": "スレッド停止",
  "threads.pool": "スレッドプール",
  "threads.delete": "スレッド削除",
  "threads.archive": "スレッドアーカイブ",
  "ngwords.manage": "NGワード管理",
  "iprestrictions.manage": "IP制限管理",
  "ninpocho.manage": "忍法帖管理",
  "logs.view": "ログ閲覧",
  "autodelete.manage": "自動削除管理",
  "banners.manage": "バナー管理",
  "plugins.manage": "プラグイン管理",
  "super": "全権限(スーパー)",
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("groups.manage"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  if (action === "create") {
    const groupName = body.groupName;
    const permValues = body.permissions;

    if (typeof groupName !== "string" || groupName.trim().length === 0) {
      return c.render(
        <ErrorMessage error={new Error("グループ名を入力してください")} />
      );
    }

    let permissions: string[] = [];
    if (Array.isArray(permValues)) {
      permissions = permValues.filter(
        (p): p is string => typeof p === "string"
      );
    } else if (typeof permValues === "string") {
      permissions = [permValues];
    }

    const result = await createAdminGroupUsecase(
      { sql, logger },
      {
        groupName: groupName.trim(),
        permissions: permissions.join(","),
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "グループ作成",
        detail: `グループ「${groupName.trim()}」を作成しました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "update") {
    const groupId = body.groupId;
    const groupName = body.groupName;
    const permValues = body.permissions;

    if (
      typeof groupId !== "string" ||
      typeof groupName !== "string" ||
      groupName.trim().length === 0
    ) {
      return c.render(
        <ErrorMessage error={new Error("グループ名を入力してください")} />
      );
    }

    let permissions: string[] = [];
    if (Array.isArray(permValues)) {
      permissions = permValues.filter(
        (p): p is string => typeof p === "string"
      );
    } else if (typeof permValues === "string") {
      permissions = [permValues];
    }

    const result = await updateAdminGroupUsecase(
      { sql, logger },
      {
        id: groupId,
        groupName: groupName.trim(),
        permissions: permissions.join(","),
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "グループ更新",
        detail: `グループ「${groupName.trim()}」(ID: ${groupId})を更新しました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "delete") {
    const groupId = body.groupId;
    if (typeof groupId !== "string") {
      return c.render(
        <ErrorMessage error={new Error("削除するグループが指定されていません")} />
      );
    }
    const result = await deleteAdminGroupUsecase({ sql, logger }, groupId);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "グループ削除",
        detail: `グループ(ID: ${groupId})を削除しました`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/groups", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const groupsResult = await getAdminGroupsUsecase({ sql, logger });
  const groups: AdminGroup[] = groupsResult.isOk() ? groupsResult.value : [];

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/groups" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">管理者グループ管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          グループ新規作成
        </h2>
        <form method="post" action="/admin/groups" className="w-full mb-8">
          <input type="hidden" name="action" value="create" />
          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="groupName"
                className="text-gray-700 text-sm font-bold mb-1 block"
              >
                グループ名
              </label>
              <input
                type="text"
                id="groupName"
                name="groupName"
                className="border border-gray-400 rounded py-2 px-3 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <p className="text-gray-700 text-sm font-bold mb-2">権限</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="permissions" value={perm} />
                    {PERMISSION_LABELS[perm] || perm}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                作成
              </button>
            </div>
          </div>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          グループ一覧
        </h2>
        {groups.length === 0 ? (
          <p className="text-gray-500">
            管理者グループは登録されていません。
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const groupPermissions = group.permissions
                .split(",")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);

              return (
                <div
                  key={group.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {group.groupName}
                      </h3>
                      <p className="text-xs text-gray-400">
                        作成日:{" "}
                        {group.createdAt.toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                        onClick={() => document.getElementById(`edit-form-${group.id}`)?.classList.toggle('hidden')}
                      >
                        編集
                      </button>
                      <form
                        method="post"
                        action="/admin/groups"
                        className="inline"
                        onSubmit={(e) => { if (!confirm('このグループを削除してもよろしいですか？')) e.preventDefault(); }}
                      >
                        <input type="hidden" name="action" value="delete" />
                        <input
                          type="hidden"
                          name="groupId"
                          value={group.id}
                        />
                        <button
                          type="submit"
                          className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {groupPermissions.length === 0 ? (
                      <span className="text-xs text-gray-400">
                        権限なし
                      </span>
                    ) : (
                      groupPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="inline-block px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700"
                        >
                          {PERMISSION_LABELS[perm] || perm}
                        </span>
                      ))
                    )}
                  </div>

                  <div
                    id={`edit-form-${group.id}`}
                    className="hidden mt-4 border-t pt-4"
                  >
                    <form
                      method="post"
                      action="/admin/groups"
                    >
                      <input
                        type="hidden"
                        name="action"
                        value="update"
                      />
                      <input
                        type="hidden"
                        name="groupId"
                        value={group.id}
                      />
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-gray-700 text-sm font-bold mb-1 block">
                            グループ名
                          </label>
                          <input
                            type="text"
                            name="groupName"
                            value={group.groupName}
                            className="border border-gray-400 rounded py-2 px-3 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <p className="text-gray-700 text-sm font-bold mb-2">
                            権限
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {AVAILABLE_PERMISSIONS.map((perm) => (
                              <label
                                key={perm}
                                className="flex items-center gap-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  name="permissions"
                                  value={perm}
                                  checked={groupPermissions.includes(
                                    perm
                                  )}
                                />
                                {PERMISSION_LABELS[perm] || perm}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <button
                            type="submit"
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            更新
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
});
