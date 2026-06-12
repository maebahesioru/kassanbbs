import { createRoute } from "honox/factory";

import { getPluginRegistryRepository } from "../../../src/plugin/repositories/getPluginRegistryRepository";
import { updatePluginActiveRepository, updatePluginOrderRepository, rescanPluginsRepository } from "../../../src/plugin/repositories/updatePluginRegistryRepository";
import { PluginRegistry } from "../../../src/plugin/core/PluginRegistry";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { PluginConfig } from "../../../src/plugin/types/PluginTypes";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("plugins.manage"),
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

  if (action === "toggle" && typeof body.name === "string") {
    const isActiveRaw = body.isActive;
    const isActive = isActiveRaw === "true" || isActiveRaw === "1";
    const result = await updatePluginActiveRepository({ sql, logger }, { name: body.name, isActive });
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    PluginRegistry.getInstance().setActive(body.name, isActive);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "プラグイン切替",
        detail: `プラグイン「${body.name}」を${isActive ? "有効" : "無効"}にしました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "reorder" && typeof body.name === "string" && typeof body.direction === "string") {
    const allRows = await sql`
      SELECT name FROM plugin_registry
      ORDER BY sort_order, name
    `;
    const currentNames = (allRows || []).map((r: any) => String(r.name));
    const idx = currentNames.indexOf(body.name);
    if (idx !== -1) {
      const newNames = [...currentNames];
      if (body.direction === "up" && idx > 0) {
        [newNames[idx - 1], newNames[idx]] = [newNames[idx], newNames[idx - 1]];
      } else if (body.direction === "down" && idx < newNames.length - 1) {
        [newNames[idx], newNames[idx + 1]] = [newNames[idx + 1], newNames[idx]];
      }
      const orderResult = await updatePluginOrderRepository({ sql, logger }, { names: newNames });
      if (orderResult.isErr()) {
        return c.render(<ErrorMessage error={orderResult.error} />);
      }
      PluginRegistry.getInstance().updateOrder(newNames);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "プラグイン順序変更",
        detail: `プラグイン「${body.name}」を${body.direction === "up" ? "上" : "下"}に移動しました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "rescan") {
    const result = await rescanPluginsRepository({ sql, logger });
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "プラグイン再スキャン",
        detail: "プラグインを再スキャンしました",
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/plugins", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const pluginsResult = await getPluginRegistryRepository({ sql, logger });
  const allPluginsResult = await sql`
    SELECT id, name, description, is_active, hook_type, config_json
    FROM plugin_registry
    ORDER BY sort_order, name
  `;
  const plugins: (PluginConfig & { id: string; isActive: boolean; hookType: number })[] = (allPluginsResult || []).map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    description: String(r.description || ""),
    isActive: Boolean(r.is_active),
    hookType: Number(r.hook_type || 0),
    hookTypes: [Number(r.hook_type || 0)],
    config: typeof r.config_json === "string" ? JSON.parse(r.config_json) : (r.config_json || {}),
  }));

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/plugins" className="text-purple-600 hover:underline font-semibold">プラグイン管理</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/groups" className="text-purple-600 hover:underline">グループ管理</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">プラグイン管理</h1>

        <div className="flex justify-end mb-4">
          <form method="post" action="/admin/plugins">
            <input type="hidden" name="action" value="rescan" />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
            >
              プラグイン再スキャン
            </button>
          </form>
        </div>

        {plugins.length === 0 ? (
          <p className="text-gray-500">プラグインは登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">順序</th>
                  <th className="p-2 text-left">名前</th>
                  <th className="p-2 text-left">説明</th>
                  <th className="p-2 text-left">フック種別</th>
                  <th className="p-2 text-left">状態</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {plugins.map((plugin, index) => (
                  <tr key={plugin.name} className="border-t">
                    <td className="p-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <form method="post" action="/admin/plugins" className="inline">
                          <input type="hidden" name="action" value="reorder" />
                          <input type="hidden" name="name" value={plugin.name} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={index === 0}
                            className="text-gray-500 hover:text-gray-700 disabled:opacity-30 text-xs leading-none"
                            title="上に移動"
                          >
                            ↑
                          </button>
                        </form>
                        <form method="post" action="/admin/plugins" className="inline">
                          <input type="hidden" name="action" value="reorder" />
                          <input type="hidden" name="name" value={plugin.name} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === plugins.length - 1}
                            className="text-gray-500 hover:text-gray-700 disabled:opacity-30 text-xs leading-none"
                            title="下に移動"
                          >
                            ↓
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="p-2 font-medium">{plugin.name}</td>
                    <td className="p-2 text-gray-600">{plugin.description}</td>
                    <td className="p-2">
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs font-mono px-1.5 py-0.5 rounded">
                        {plugin.hookType}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${plugin.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {plugin.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className="p-2">
                      <form method="post" action="/admin/plugins" className="inline">
                        <input type="hidden" name="action" value="toggle" />
                        <input type="hidden" name="name" value={plugin.name} />
                        <input type="hidden" name="isActive" value={plugin.isActive ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`text-xs font-bold py-1 px-3 rounded focus:outline-none ${
                            plugin.isActive
                              ? "bg-red-500 hover:bg-red-700 text-white"
                              : "bg-green-500 hover:bg-green-700 text-white"
                          }`}
                        >
                          {plugin.isActive ? "無効化" : "有効化"}
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