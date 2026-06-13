import { createRoute } from "honox/factory";

import { getAllThreadsRepository } from "../../../src/conversation/repositories/getAllThreadsRepository";
import { getAllResponsesByThreadIdRepository } from "../../../src/conversation/repositories/getAllResponsesByThreadIdRepository";
import { updateResponseUsecase } from "../../../src/conversation/usecases/updateResponseUsecase";
import { permanentDeleteResponseUsecase } from "../../../src/conversation/usecases/permanentDeleteResponseUsecase";
import { adminPostResponseUsecase } from "../../../src/conversation/usecases/adminPostResponseUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("threads.delete"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;

  if (action === "edit") {
    const threadId = body.threadId;
    const responseNumber = body.responseNumber;
    const authorName = body.authorName;
    const mail = body.mail;
    const responseContent = body.responseContent;

    if (typeof threadId !== "string" || typeof responseNumber !== "string" || typeof authorName !== "string" || typeof mail !== "string" || typeof responseContent !== "string") {
      return c.render(
        <ErrorMessage error={new Error("必須項目が不足しています")} />
      );
    }

    const result = await updateResponseUsecase(
      { sql, logger },
      {
        threadId,
        responseNumber: parseInt(responseNumber, 10),
        authorName,
        mail,
        responseContent,
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "レス編集",
        detail: `スレッドID: ${threadId}, レス番号: ${responseNumber}`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "delete") {
    const threadId = body.threadId;
    const responseNumber = body.responseNumber;

    if (typeof threadId !== "string" || typeof responseNumber !== "string") {
      return c.render(
        <ErrorMessage error={new Error("必須項目が不足しています")} />
      );
    }

    const result = await permanentDeleteResponseUsecase(
      { sql, logger },
      {
        threadId,
        responseNumber: parseInt(responseNumber, 10),
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "レス完全削除",
        detail: `スレッドID: ${threadId}, レス番号: ${responseNumber}`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "adminPost") {
    const threadId = body.threadId;
    const authorName = body.authorName;
    const mail = body.mail;
    const responseContent = body.responseContent;
    const wattyoi = body.wattyoi;

    if (typeof threadId !== "string" || typeof responseContent !== "string") {
      return c.render(
        <ErrorMessage error={new Error("必須項目が不足しています")} />
      );
    }

    const adminIp = getIpAddress(c);
    const result = await adminPostResponseUsecase(
      { sql, logger },
      {
        threadIdRaw: threadId,
        authorNameRaw: typeof authorName === "string" ? authorName : "",
        mailRaw: typeof mail === "string" ? mail : "",
        responseContentRaw: responseContent,
        ipAddressRaw: adminIp,
        wattyoi: typeof wattyoi === "string" ? wattyoi : undefined,
      }
    );
    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "管理者投稿",
        detail: `スレッドID: ${threadId}, 名前: ${authorName}`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/responses", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const threadsResult = await getAllThreadsRepository({ sql, logger });
  const threads = threadsResult.isOk() ? threadsResult.value : [];

  const selectedThreadId = c.req.query("threadId");
  const threadTitle = selectedThreadId
    ? threads.find((t) => t.id.val === selectedThreadId)?.title.val ?? ""
    : "";

  let responses: any[] = [];
  if (selectedThreadId) {
    const { createWriteThreadId } = await import("../../../src/conversation/domain/write/WriteThreadId");
    const threadIdResult = createWriteThreadId(selectedThreadId);
    if (threadIdResult.isOk()) {
      const responsesResult = await getAllResponsesByThreadIdRepository(
        { sql, logger },
        { threadId: threadIdResult.value, isAdmin: true }
      );
      if (responsesResult.isOk()) {
        responses = responsesResult.value.responses.map((r) => ({
          id: r.responseId.val,
          number: r.responseNumber.val,
          authorName: r.authorName.val._type === "some"
            ? `${r.authorName.val.authorName}◆${r.authorName.val.trip}`
            : r.authorName.val.authorName,
          mail: r.mail.val,
          postedAt: r.postedAt.val,
          content: r.responseContent.val,
          hashId: r.hashId.val,
          wattyoi: r.wattyoi,
          isOwner: r.isOwner,
          isSubOwner: r.isSubOwner,
          capcode: r.capcode,
        }));
      }
    }
  }

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/responses" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">レス管理</h1>

        <div className="mb-6">
          <label className="text-gray-700 text-sm font-bold mb-1 block">スレッド選択</label>
          <form method="get" action="/admin/responses" className="flex gap-2">
            <select name="threadId" className="border border-gray-400 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-grow">
              <option value="">-- スレッドを選択 --</option>
              {threads.map((t) => (
                <option key={t.id.val} value={t.id.val} selected={t.id.val === selectedThreadId}>
                  [{t.countResponse}] {t.title.val}
                </option>
              ))}
            </select>
            <button type="submit" className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              表示
            </button>
          </form>
        </div>

        {responses.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">{threadTitle}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left w-12">#</th>
                    <th className="p-2 text-left">名前</th>
                    <th className="p-2 text-left">X ID</th>
                    <th className="p-2 text-left">内容</th>
                    <th className="p-2 text-left">日時</th>
                    <th className="p-2 text-left">ハッシュID</th>
                    <th className="p-2 text-left">トリップ</th>
                    <th className="p-2 text-left">わたゆい</th>
                    <th className="p-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-bold">{r.number}</td>
                      <td className="p-2 max-w-xs truncate">{r.authorName}</td>
                      <td className="p-2 max-w-xs truncate">{r.mail}</td>
                      <td className="p-2 max-w-md truncate">{r.content}</td>
                      <td className="p-2 text-xs whitespace-nowrap">{formatDate(r.postedAt)}</td>
                      <td className="p-2 text-xs font-mono">{r.hashId}</td>
                      <td className="p-2 text-xs">{r.authorName.includes("◆") ? r.authorName.split("◆")[1] : ""}</td>
                      <td className="p-2 text-xs">{r.wattyoi || ""}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <details className="relative">
                            <summary className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded cursor-pointer">編集</summary>
                            <form method="post" action="/admin/responses" className="mt-2 bg-gray-50 p-3 rounded border text-xs absolute right-0 z-10 w-96">
                              <input type="hidden" name="action" value="edit" />
                              <input type="hidden" name="threadId" value={selectedThreadId} />
                              <input type="hidden" name="responseNumber" value={r.number} />
                              <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2">
                                  <span className="w-16">名前:</span>
                                  <input type="text" name="authorName" defaultValue={r.authorName} className="border rounded px-1 flex-grow" />
                                </label>
                                <label className="flex items-center gap-2">
                                  <span className="w-16">X ID:</span>
                                  <input type="text" name="mail" defaultValue={r.mail} className="border rounded px-1 flex-grow" />
                                </label>
                                <label className="flex items-start gap-2">
                                  <span className="w-16">内容:</span>
                                  <textarea name="responseContent" defaultValue={r.content} className="border rounded px-1 flex-grow h-20" />
                                </label>
                                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded">保存</button>
                              </div>
                            </form>
                          </details>
                          <form method="post" action="/admin/responses" className="inline" onSubmit={(e) => { if (!confirm('このレスを完全に削除しますか？レス番号が振り直されます。')) e.preventDefault(); }}>
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="threadId" value={selectedThreadId} />
                            <input type="hidden" name="responseNumber" value={r.number} />
                            <button type="submit" className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded">削除</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">管理者投稿</h2>
          <form method="post" action="/admin/responses" className="bg-gray-50 p-4 rounded border">
            <input type="hidden" name="action" value="adminPost" />
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <span className="w-24">スレッド:</span>
                <select name="threadId" className="border border-gray-400 rounded py-1 px-2 flex-grow">
                  <option value="">-- スレッドを選択 --</option>
                  {threads.map((t) => (
                    <option key={t.id.val} value={t.id.val} selected={t.id.val === selectedThreadId}>
                      {t.title.val}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24">名前:</span>
                <input type="text" name="authorName" placeholder="管理者" className="border border-gray-400 rounded py-1 px-2 flex-grow" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24">X ID:</span>
                <input type="text" name="mail" className="border border-gray-400 rounded py-1 px-2 flex-grow" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24">わたゆい:</span>
                <input type="text" name="wattyoi" className="border border-gray-400 rounded py-1 px-2 flex-grow" />
              </label>
              <label className="flex items-start gap-2">
                <span className="w-24">内容:</span>
                <textarea name="responseContent" className="border border-gray-400 rounded py-1 px-2 flex-grow h-24" required></textarea>
              </label>
              <div className="flex justify-end">
                <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">投稿</button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
});
