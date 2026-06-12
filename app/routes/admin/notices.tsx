import { createRoute } from "honox/factory";

import {
  getNoticesUsecase,
  createNoticeUsecase,
  updateNoticeUsecase,
  deleteNoticeUsecase,
} from "../../../src/notice/usecases/manageNoticesUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";

import type { ReadNotice } from "../../../src/notice/domain/read/ReadNotice";

export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  if (action === "add") {
    const title = body.title;
    const content = body.content;
    const targetType = body.targetType;
    const targetValue = body.targetValue;
    const expiresAtStr = body.expiresAt;

    if (
      typeof title === "string" &&
      typeof content === "string" &&
      title.trim().length > 0 &&
      content.trim().length > 0
    ) {
      const expiresAt = typeof expiresAtStr === "string" && expiresAtStr.trim()
        ? new Date(expiresAtStr)
        : null;
      const result = await createNoticeUsecase({ sql, logger }, {
        title: title.trim(),
        content: content.trim(),
        targetType: typeof targetType === "string" ? targetType : "all",
        targetValue: typeof targetValue === "string" ? targetValue : "",
        expiresAt,
      });
      if (result.isErr()) {
        return c.render(<ErrorMessage error={result.error} />);
      }
      const adminIp = getIpAddress(c);
      await addAdminLogUsecase(
        { sql, logger },
        {
          action: "お知らせ追加",
          detail: `お知らせ「${title.trim()}」を追加しました`,
          ipAddress: adminIp,
        }
      );
    }
  } else if (action === "toggle") {
    const id = body.id;
    const isActive = body.isActive;

    if (typeof id === "string") {
      const noticesResult = await getNoticesUsecase({ sql, logger }, true);
      if (noticesResult.isOk()) {
        const notice = noticesResult.value.find(
          (n: { id: string }) => n.id === id
        );
        if (notice) {
          const newActive = isActive === "off" ? false : true;
          await updateNoticeUsecase({ sql, logger }, {
            id: notice.id,
            title: notice.title,
            content: notice.content,
            targetType: notice.targetType,
            targetValue: notice.targetValue,
            isActive: newActive,
            expiresAt: notice.expiresAt,
          });
          const adminIp = getIpAddress(c);
          await addAdminLogUsecase(
            { sql, logger },
            {
              action: "お知らせ切替",
              detail: `お知らせ「${notice.title}」を${newActive ? "有効" : "無効"}にしました`,
              ipAddress: adminIp,
            }
          );
        }
      }
    }
  } else if (action === "delete") {
    const id = body.id;
    if (typeof id === "string") {
      const result = await deleteNoticeUsecase({ sql, logger }, id);
      if (result.isErr()) {
        return c.render(<ErrorMessage error={result.error} />);
      }
      const adminIp = getIpAddress(c);
      await addAdminLogUsecase(
        { sql, logger },
        {
          action: "お知らせ削除",
          detail: `お知らせ(ID: ${id})を削除しました`,
          ipAddress: adminIp,
        }
      );
    }
  }

  return c.redirect("/admin/notices", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const allNoticesResult = await getNoticesUsecase({ sql, logger }, true);
  const notices: ReadNotice[] = allNoticesResult.isOk()
    ? allNoticesResult.value
    : [];

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/groups" className="text-purple-600 hover:underline">グループ管理</a>
          <a href="/admin/ninpocho" className="text-purple-600 hover:underline">忍法帖管理</a>
          <a href="/admin/banners" className="text-purple-600 hover:underline">バナー管理</a>
          <a href="/admin/notices" className="text-purple-600 hover:underline font-semibold">お知らせ管理</a>
          <a href="/admin/rebuild" className="text-purple-600 hover:underline">インデックス再構築</a>
          <a href="/admin/update" className="text-purple-600 hover:underline">アップデート確認</a>
          <a href="/admin/federation" className="text-purple-600 hover:underline">連合設定</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
          <a href="/admin/autodelete" className="text-purple-600 hover:underline">自動削除設定</a>
        </nav>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">お知らせ管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">お知らせ追加</h2>
        <form method="post" action="/admin/notices" className="w-full mb-8 space-y-4">
          <input type="hidden" name="action" value="add" />
          <div className="flex flex-col">
            <label htmlFor="title" className="text-gray-700 text-sm font-bold mb-1">
              タイトル
            </label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="お知らせタイトル"
              className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="content" className="text-gray-700 text-sm font-bold mb-1">
              内容
            </label>
            <textarea
              id="content"
              name="content"
              placeholder="お知らせ内容"
              className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
              required
            ></textarea>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex flex-col md:w-1/2">
              <label htmlFor="targetType" className="text-gray-700 text-sm font-bold mb-1">
                対象タイプ
              </label>
              <select
                id="targetType"
                name="targetType"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">全体</option>
                <option value="ip">IP</option>
                <option value="host">ホスト</option>
                <option value="hash_id">ID</option>
              </select>
            </div>
            <div className="flex flex-col md:w-1/2">
              <label htmlFor="targetValue" className="text-gray-700 text-sm font-bold mb-1">
                対象値
              </label>
              <input
                type="text"
                id="targetValue"
                name="targetValue"
                placeholder="対象のIP/ホスト/ID値"
                className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label htmlFor="expiresAt" className="text-gray-700 text-sm font-bold mb-1">
              有効期限
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              name="expiresAt"
              className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            追加
          </button>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">お知らせ一覧</h2>
        {notices.length === 0 ? (
          <p className="text-gray-500">お知らせは登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">タイトル</th>
                  <th className="p-2 text-left">対象</th>
                  <th className="p-2 text-left">有効</th>
                  <th className="p-2 text-left">有効期限</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice: ReadNotice) => (
                  <tr key={notice.id} className="border-t">
                    <td className="p-2">{notice.title}</td>
                    <td className="p-2 text-xs">
                      {notice.targetType === "all"
                        ? "全体"
                        : `${notice.targetType}:${notice.targetValue}`}
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          notice.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {notice.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className="p-2 text-xs">
                      {notice.expiresAt
                        ? new Date(notice.expiresAt).toLocaleString("ja-JP")
                        : "なし"}
                    </td>
                    <td className="p-2 flex gap-1">
                      <form method="post" action="/admin/notices" className="inline">
                        <input type="hidden" name="action" value="toggle" />
                        <input type="hidden" name="id" value={notice.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={notice.isActive ? "off" : "on"}
                        />
                        <button
                          type="submit"
                          className={`text-white text-xs font-bold py-1 px-3 rounded ${
                            notice.isActive
                              ? "bg-yellow-500 hover:bg-yellow-700"
                              : "bg-green-500 hover:bg-green-700"
                          }`}
                        >
                          {notice.isActive ? "無効化" : "有効化"}
                        </button>
                      </form>
                      <form method="post" action="/admin/notices" className="inline">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={notice.id} />
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
