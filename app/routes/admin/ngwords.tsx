import { createRoute } from "honox/factory";

import { getNgWordsListUsecase } from "../../../src/ngword/usecases/manageNgWordsUsecase";
import { addNgWordUsecase } from "../../../src/ngword/usecases/manageNgWordsUsecase";
import { deleteNgWordUsecase } from "../../../src/ngword/usecases/manageNgWordsUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getIpAddress } from "../../utils/getIpAddress";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import NgWordTest from "../../islands/NgWordTest";

import type { ReadNgWord } from "../../../src/ngword/domain/read/ReadNgWord";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("ngwords.manage"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;
  const word = body.word;
  const id = body.id;

  if (action === "add" && typeof word === "string" && word.trim().length > 0) {
    const result = await addNgWordUsecase({ sql, logger }, word.trim());
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "NGワード追加",
        detail: `NGワード「${word.trim()}」を追加しました`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "delete" && typeof id === "string") {
    const result = await deleteNgWordUsecase({ sql, logger }, id);
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "NGワード削除",
        detail: `NGワード(ID: ${id})を削除しました`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/ngwords", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const ngWordsResult = await getNgWordsListUsecase({ sql, logger });
  const ngWords: ReadNgWord[] = ngWordsResult.isOk() ? ngWordsResult.value : [];

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <nav className="flex gap-4 mb-6 flex-wrap">
          <a href="/admin" className="text-purple-600 hover:underline">基本設定</a>
          <a href="/admin/ngwords" className="text-purple-600 hover:underline font-semibold">NGワード</a>
          <a href="/admin/iprestrictions" className="text-purple-600 hover:underline">IP制限</a>
          <a href="/admin/threads" className="text-purple-600 hover:underline">スレッド管理</a>
          <a href="/admin/users" className="text-purple-600 hover:underline">ユーザー管理</a>
          <a href="/admin/groups" className="text-purple-600 hover:underline">グループ管理</a>
          <a href="/admin/password" className="text-purple-600 hover:underline">パスワード変更</a>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">NGワード管理</h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">NGワード追加</h2>
        <form method="post" action="/admin/ngwords" className="w-full mb-8">
          <input type="hidden" name="action" value="add" />
          <div className="flex gap-2">
            <input
              type="text"
              name="word"
              placeholder="NGワードを入力"
              className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="submit"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              追加
            </button>
          </div>
        </form>

        <h2 className="text-xl font-semibold text-gray-700 mb-4">NGワード一覧</h2>
        {ngWords.length === 0 ? (
          <p className="text-gray-500">NGワードは登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">ワード</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {ngWords.map((ngWord) => (
                  <tr key={ngWord.id} className="border-t">
                    <td className="p-2 text-gray-500 text-xs">{ngWord.id}</td>
                    <td className="p-2">{ngWord.word}</td>
                    <td className="p-2">
                      <form method="post" action="/admin/ngwords" className="inline">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={ngWord.id} />
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

      <section className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">NGワードテスト</h2>
        <NgWordTest words={ngWords.map(w => w.word)} />
      </section>
    </main>
  );
});
