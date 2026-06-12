import { createRoute } from "honox/factory";

import {
  getBannersUsecase,
  createBannerUsecase,
  updateBannerUsecase,
  deleteBannerUsecase,
} from "../../../src/banner/usecases/manageBannersUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { ReadBanner } from "../../../src/banner/domain/read/ReadBanner";

export const POST = createRoute(
  requirePermission("banners.manage"),
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
    const name = body.name;
    const imageUrl = body.imageUrl;
    const linkUrl = body.linkUrl;
    const position = body.position;

    if (
      typeof name === "string" &&
      typeof imageUrl === "string" &&
      name.trim().length > 0 &&
      imageUrl.trim().length > 0
    ) {
      const result = await createBannerUsecase({ sql, logger }, {
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: typeof linkUrl === "string" ? linkUrl.trim() : "",
        position: typeof position === "string" ? Number(position) : 0,
      });
      if (result.isErr()) {
        return c.render(<ErrorMessage error={result.error} />);
      }
      const adminIp = getIpAddress(c);
      await addAdminLogUsecase(
        { sql, logger },
        {
          action: "バナー追加",
          detail: `バナー「${name.trim()}」を追加しました`,
          ipAddress: adminIp,
        }
      );
    }
  } else if (action === "edit") {
    const id = body.id;
    const name = body.name;
    const imageUrl = body.imageUrl;
    const linkUrl = body.linkUrl;
    const position = body.position;
    const isActive = body.isActive;

    if (
      typeof id === "string" &&
      typeof name === "string" &&
      typeof imageUrl === "string" &&
      name.trim().length > 0 &&
      imageUrl.trim().length > 0
    ) {
      const result = await updateBannerUsecase({ sql, logger }, {
        id,
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: typeof linkUrl === "string" ? linkUrl.trim() : "",
        position: typeof position === "string" ? Number(position) : 0,
        isActive: isActive === "on" || isActive === "true",
      });
      if (result.isErr()) {
        return c.render(<ErrorMessage error={result.error} />);
      }
      const adminIp = getIpAddress(c);
      await addAdminLogUsecase(
        { sql, logger },
        {
          action: "バナー更新",
          detail: `バナー「${name.trim()}」を更新しました`,
          ipAddress: adminIp,
        }
      );
    }
  } else if (action === "toggle") {
    const id = body.id;
    const isActive = body.isActive;

    if (typeof id === "string") {
      const bannersResult = await getBannersUsecase({ sql, logger }, true);
      if (bannersResult.isOk()) {
        const banner = bannersResult.value.find(
          (b) => b.id === id
        );
        if (banner) {
          const newActive = isActive === "off" ? false : true;
          await updateBannerUsecase({ sql, logger }, {
            id: banner.id,
            name: banner.name,
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl,
            position: banner.position,
            isActive: newActive,
          });
          const adminIp = getIpAddress(c);
          await addAdminLogUsecase(
            { sql, logger },
            {
              action: "バナー切替",
              detail: `バナー「${banner.name}」を${newActive ? "有効" : "無効"}にしました`,
              ipAddress: adminIp,
            }
          );
        }
      }
    }
  } else if (action === "delete") {
    const id = body.id;
    if (typeof id === "string") {
      const result = await deleteBannerUsecase({ sql, logger }, id);
      if (result.isErr()) {
        return c.render(<ErrorMessage error={result.error} />);
      }
      const adminIp = getIpAddress(c);
      await addAdminLogUsecase(
        { sql, logger },
        {
          action: "バナー削除",
          detail: `バナー(ID: ${id})を削除しました`,
          ipAddress: adminIp,
        }
      );
    }
  }

  return c.redirect("/admin/banners", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const allBannersResult = await getBannersUsecase({ sql, logger }, true);
  const banners: ReadBanner[] = allBannersResult.isOk()
    ? allBannersResult.value
    : [];

  const editId = c.req.query("edit");
  const editingBanner = editId
    ? banners.find((b) => b.id === editId)
    : undefined;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/banners" className="text-purple-600 hover:underline font-semibold">バナー管理</a>
          <a href="/admin/rebuild" className="text-purple-600 hover:underline">インデックス再構築</a>
          <a href="/admin/update" className="text-purple-600 hover:underline">アップデート確認</a>
          <a href="/admin/federation" className="text-purple-600 hover:underline">連合設定</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
        </nav>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">バナー管理</h1>

        {editingBanner ? (
          <>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">バナー編集</h2>
            <form method="post" action="/admin/banners" className="w-full mb-8 space-y-4">
              <input type="hidden" name="action" value="edit" />
              <input type="hidden" name="id" value={editingBanner.id} />
              <div className="flex flex-col">
                <label htmlFor="name" className="text-gray-700 text-sm font-bold mb-1">
                  バナー名
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editingBanner.name}
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="imageUrl" className="text-gray-700 text-sm font-bold mb-1">
                  画像URL
                </label>
                <input
                  type="text"
                  id="imageUrl"
                  name="imageUrl"
                  value={editingBanner.imageUrl}
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="linkUrl" className="text-gray-700 text-sm font-bold mb-1">
                  リンクURL
                </label>
                <input
                  type="text"
                  id="linkUrl"
                  name="linkUrl"
                  value={editingBanner.linkUrl}
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="position" className="text-gray-700 text-sm font-bold mb-1">
                  表示順
                </label>
                <input
                  type="number"
                  id="position"
                  name="position"
                  value={editingBanner.position}
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={editingBanner.isActive}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-gray-700 text-sm font-bold">
                  有効
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  更新
                </button>
                <a
                  href="/admin/banners"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded focus:outline-none"
                >
                  キャンセル
                </a>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">バナー追加</h2>
            <form method="post" action="/admin/banners" className="w-full mb-8 space-y-4">
              <input type="hidden" name="action" value="add" />
              <div className="flex flex-col">
                <label htmlFor="name" className="text-gray-700 text-sm font-bold mb-1">
                  バナー名
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="バナー名"
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="imageUrl" className="text-gray-700 text-sm font-bold mb-1">
                  画像URL
                </label>
                <input
                  type="text"
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/banner.png"
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="linkUrl" className="text-gray-700 text-sm font-bold mb-1">
                  リンクURL
                </label>
                <input
                  type="text"
                  id="linkUrl"
                  name="linkUrl"
                  placeholder="https://example.com"
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="position" className="text-gray-700 text-sm font-bold mb-1">
                  表示順
                </label>
                <input
                  type="number"
                  id="position"
                  name="position"
                  defaultValue={0}
                  className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                追加
              </button>
            </form>
          </>
        )}

        <h2 className="text-xl font-semibold text-gray-700 mb-4">バナー一覧</h2>
        {banners.length === 0 ? (
          <p className="text-gray-500">バナーは登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">名前</th>
                  <th className="p-2 text-left">画像URL</th>
                  <th className="p-2 text-left">リンクURL</th>
                  <th className="p-2 text-left">表示順</th>
                  <th className="p-2 text-left">有効</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id} className="border-t">
                    <td className="p-2">{banner.name}</td>
                    <td className="p-2 text-xs text-gray-500 max-w-xs truncate">
                      {banner.imageUrl}
                    </td>
                    <td className="p-2 text-xs text-gray-500 max-w-xs truncate">
                      {banner.linkUrl || "-"}
                    </td>
                    <td className="p-2">{banner.position}</td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          banner.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {banner.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className="p-2 flex gap-1">
                      <a
                        href={`/admin/banners?edit=${banner.id}`}
                        className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded"
                      >
                        編集
                      </a>
                      <form method="post" action="/admin/banners" className="inline">
                        <input type="hidden" name="action" value="toggle" />
                        <input type="hidden" name="id" value={banner.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={banner.isActive ? "off" : "on"}
                        />
                        <button
                          type="submit"
                          className={`text-white text-xs font-bold py-1 px-3 rounded ${
                            banner.isActive
                              ? "bg-yellow-500 hover:bg-yellow-700"
                              : "bg-green-500 hover:bg-green-700"
                          }`}
                        >
                          {banner.isActive ? "無効化" : "有効化"}
                        </button>
                      </form>
                      <form method="post" action="/admin/banners" className="inline">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={banner.id} />
                        <button
                          type="submit"
                          className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded"
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
