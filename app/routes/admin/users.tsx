import { createRoute } from "honox/factory";

import { getAdminUsersUsecase } from "../../../src/admin/usecases/manageAdminUsersUsecase";
import { createAdminUserUsecase } from "../../../src/admin/usecases/manageAdminUsersUsecase";
import { deleteAdminUserUsecase } from "../../../src/admin/usecases/manageAdminUsersUsecase";
import {
  getAdminGroupsUsecase,
  getUserGroupsUsecase,
  setUserGroupsUsecase,
} from "../../../src/cap/usecases/manageGroupsUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { AdminUser } from "../../../src/admin/repositories/getAdminUsersRepository";
import type { AdminGroup } from "../../../src/cap/repositories/getAdminGroupsRepository";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("users.manage"),
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
    const username = body.username;
    const password = body.password;
    const fullName = body.fullName;
    const isSuperAdmin = body.isSuperAdmin === "true";

    if (
      typeof username !== "string" ||
      username.trim().length === 0 ||
      typeof password !== "string" ||
      password.trim().length === 0
    ) {
      return c.render(
        <ErrorMessage error={new Error("ユーザー名とパスワードを入力してください")} />
      );
    }

    const result = await createAdminUserUsecase(
      { sql, logger },
      {
        username: username.trim(),
        password: password.trim(),
        fullName: typeof fullName === "string" ? fullName.trim() : "",
        isSuperAdmin,
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "管理者追加",
        detail: `管理者「${username.trim()}」を追加しました (スーパー管理者: ${isSuperAdmin ? "はい" : "いいえ"})`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "setgroups") {
    const userId = body.userId;
    const groupIds = body.groupIds;

    if (typeof userId !== "string") {
      return c.render(
        <ErrorMessage error={new Error("ユーザーが指定されていません")} />
      );
    }

    let groups: string[] = [];
    if (Array.isArray(groupIds)) {
      groups = groupIds.filter((g): g is string => typeof g === "string");
    } else if (typeof groupIds === "string") {
      groups = [groupIds];
    }

    const result = await setUserGroupsUsecase(
      { sql, logger },
      { userId, groupIds: groups }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "グループ設定",
        detail: `ユーザー(ID: ${userId})のグループを設定しました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "delete") {
    const id = body.id;
    if (typeof id !== "string") {
      return c.render(
        <ErrorMessage error={new Error("削除するユーザーが指定されていません")} />
      );
    }
    const result = await deleteAdminUserUsecase({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "管理者削除",
        detail: `管理者(ID: ${id})を削除しました`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/users", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const usersResult = await getAdminUsersUsecase({ sql, logger });
  const users: AdminUser[] = usersResult.isOk() ? usersResult.value : [];

  const groupsResult = await getAdminGroupsUsecase({ sql, logger });
  const groups: AdminGroup[] = groupsResult.isOk() ? groupsResult.value : [];

  const userGroupsMap = new Map<string, string[]>();
  for (const user of users) {
    const ugResult = await getUserGroupsUsecase({ sql, logger }, user.id);
    if (ugResult.isOk()) {
      userGroupsMap.set(
        user.id,
        ugResult.value.map((ug) => ug.groupId)
      );
    }
  }

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/users" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">管理者ユーザー管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">管理者追加</h2>
        <form method="post" action="/admin/users" className="w-full mb-8">
          <input type="hidden" name="action" value="add" />
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex flex-col flex-grow">
                <label htmlFor="username" className="text-gray-700 text-sm font-bold mb-1">
                  ユーザー名
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col flex-grow">
                <label htmlFor="fullName" className="text-gray-700 text-sm font-bold mb-1">
                  表示名
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col flex-grow">
                <label htmlFor="password" className="text-gray-700 text-sm font-bold mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 text-gray-700 text-sm font-bold mb-1">
                  <input type="checkbox" name="isSuperAdmin" value="true" />
                  スーパー管理者
                </label>
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                追加
              </button>
            </div>
          </div>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">管理者一覧</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">管理者ユーザーは登録されていません。</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const userGroupIds = userGroupsMap.get(user.id) || [];
              return (
                <div key={user.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-gray-800">
                        {user.username}
                      </span>
                      {user.fullName && (
                        <span className="text-gray-500 ml-2">
                          ({user.fullName})
                        </span>
                      )}
                      <span
                        className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          user.isSuperAdmin
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.isSuperAdmin ? "スーパー管理者" : "一般管理者"}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400">
                        {user.createdAt.toLocaleString("ja-JP")}
                      </span>
                      <form
                        method="post"
                        action="/admin/users"
                        className="inline"
                        onSubmit={(e) => { if (user.isSuperAdmin && !confirm('スーパー管理者を削除してもよろしいですか？')) e.preventDefault(); }}
                      >
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={user.id} />
                        <button
                          type="submit"
                          className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  </div>
                  {!user.isSuperAdmin && groups.length > 0 && (
                    <form
                      method="post"
                      action="/admin/users"
                      className="mt-3"
                    >
                      <input
                        type="hidden"
                        name="action"
                        value="setgroups"
                      />
                      <input
                        type="hidden"
                        name="userId"
                        value={user.id}
                      />
                      <p className="text-xs text-gray-500 mb-1">
                        所属グループ:
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {groups.map((group) => (
                          <label
                            key={group.id}
                            className="flex items-center gap-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              name="groupIds"
                              value={group.id}
                              checked={userGroupIds.includes(
                                group.id
                              )}
                            />
                            {group.groupName}
                          </label>
                        ))}
                        <button
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                        >
                          更新
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
});
