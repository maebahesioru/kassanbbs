import { createRoute } from "honox/factory";

import { getAllThreadsRepository } from "../../../src/conversation/repositories/getAllThreadsRepository";
import { generateSubjectTxtRepository } from "../../../src/conversation/repositories/generateSubjectTxtRepository";
import { toggleThreadStopUsecase } from "../../../src/conversation/usecases/toggleThreadStopUsecase";
import { toggleThreadPoolUsecase } from "../../../src/conversation/usecases/toggleThreadPoolUsecase";
import { deleteThreadUsecase } from "../../../src/conversation/usecases/deleteThreadUsecase";
import { archiveThreadUsecase } from "../../../src/archive/usecases/archiveThreadUsecase";
import { setThreadAutoDeleteUsecase } from "../../../src/autodelete/usecases/setThreadAutoDeleteUsecase";
import { unarchiveThreadUsecase } from "../../../src/archive/usecases/unarchiveThreadUsecase";
import { updateThreadAttrsUsecase } from "../../../src/conversation/usecases/updateThreadAttrsUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";
import { requirePermission } from "../../middlewares/requirePermissionMiddleware";

import type { ReadThread } from "../../../src/conversation/domain/read/ReadThread";

interface ThreadAttrsDisplay {
  sticky?: boolean;
  sageOnly?: boolean;
  password?: string;
  customMaxRes?: number;
  noId?: boolean;
  force774?: boolean;
  custom774?: string;
  live?: boolean;
  hideNushi?: boolean;
  noPool?: boolean;
  ninpochoLevel?: number;
  subOwnerHashId?: string;
  slipLevel?: string;
  othelloGameState?: string;
  postBackground?: string;
  nameColor?: string;
  capColor?: string;
  bans?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(
  requirePermission("threads.stop"),
  async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const action = body.action;
  const threadId = body.threadId;

  if (action === "subjecttxt") {
    const regenResult = await generateSubjectTxtRepository({ sql, logger });
    if (regenResult.isErr()) {
      return c.render(<ErrorMessage error={regenResult.error} />);
    }
    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "subject.txt更新",
        detail: "subject.txtを再生成しました",
        ipAddress: adminIp,
      }
    );
    return c.redirect("/admin/threads", 303);
  }

  if (typeof threadId !== "string") {
    return c.render(
      <ErrorMessage error={new Error("スレッドIDが指定されていません")} />
    );
  }

  if (action === "stop" || action === "pool" || action === "delete" || action === "archive" || action === "unarchive" || action === "autodelete") {
    let result;
    let logAction = "";

    if (action === "stop") {
      result = await toggleThreadStopUsecase({ sql, logger }, { threadIdRaw: threadId });
      logAction = "スレッド停止切替";
    } else if (action === "pool") {
      result = await toggleThreadPoolUsecase({ sql, logger }, { threadIdRaw: threadId });
      logAction = "スレッドプール切替";
    } else if (action === "archive") {
      result = await archiveThreadUsecase({ sql, logger }, { threadIdRaw: threadId });
      logAction = "スレッドアーカイブ";
    } else if (action === "unarchive") {
      result = await unarchiveThreadUsecase({ sql, logger }, { threadIdRaw: threadId });
      logAction = "スレッドアーカイブ解除";
    } else if (action === "autodelete") {
      const daysRaw = body.days;
      const days = typeof daysRaw === "string" ? parseInt(daysRaw, 10) : 1;
      result = await setThreadAutoDeleteUsecase({ sql, logger }, { threadIdRaw: threadId, daysRaw: days });
      logAction = "スレッド自動削除設定";
    } else {
      result = await deleteThreadUsecase({ sql, logger }, { threadIdRaw: threadId });
      logAction = "スレッド削除";
    }

    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: logAction,
        detail: `スレッド(ID: ${threadId}) 操作: ${action}`,
        ipAddress: adminIp,
      }
    );
  } else if (action === "updateAttrs") {
    const attrs: Record<string, unknown> = {};

    if (typeof body.sticky === "string") attrs.sticky = true;
    if (typeof body.sageOnly === "string") attrs.sageOnly = true;
    if (typeof body.noId === "string") attrs.noId = true;
    if (typeof body.force774 === "string") attrs.force774 = true;
    if (typeof body.live === "string") attrs.live = true;
    if (typeof body.hideNushi === "string") attrs.hideNushi = true;
    if (typeof body.noPool === "string") attrs.noPool = true;

    if (typeof body.customMaxRes === "string" && body.customMaxRes !== "") {
      const val = parseInt(body.customMaxRes, 10);
      if (!isNaN(val) && val > 0) attrs.customMaxRes = val;
    }
    if (typeof body.custom774 === "string" && body.custom774 !== "") {
      attrs.custom774 = body.custom774;
    }
    if (typeof body.ninpochoLevel === "string" && body.ninpochoLevel !== "") {
      const val = parseInt(body.ninpochoLevel, 10);
      if (!isNaN(val) && val >= 0) attrs.ninpochoLevel = val;
    }
    if (typeof body.password === "string" && body.password !== "") {
      attrs.password = body.password;
    }
    if (typeof body.slipLevel === "string" && body.slipLevel !== "") {
      attrs.slipLevel = body.slipLevel;
    }
    if (typeof body.subOwnerHashId === "string" && body.subOwnerHashId !== "") {
      attrs.subOwnerHashId = body.subOwnerHashId;
    }
    if (typeof body.postBackground === "string" && body.postBackground !== "") {
      attrs.postBackground = body.postBackground;
    }
    if (typeof body.nameColor === "string" && body.nameColor !== "") {
      attrs.nameColor = body.nameColor;
    }
    if (typeof body.capColor === "string" && body.capColor !== "") {
      attrs.capColor = body.capColor;
    }
    if (typeof body.bansText === "string" && body.bansText.trim() !== "") {
      const bans: Record<string, string> = {};
      for (const line of body.bansText.split("\n")) {
        const hashId = line.trim();
        if (hashId) {
          bans[hashId] = "banned";
        }
      }
      attrs.bans = bans;
    } else if (typeof body.bansText === "string") {
      attrs.bans = {};
    }

    const result = await updateThreadAttrsUsecase(
      { sql, logger },
      { threadIdRaw: threadId, attrs }
    );

    if (result.isErr()) {
      return c.render(<ErrorMessage error={result.error} />);
    }

    const adminIp = getIpAddress(c);
    await addAdminLogUsecase(
      { sql, logger },
      {
        action: "スレッド属性更新",
        detail: `スレッド(ID: ${threadId}) 属性更新`,
        ipAddress: adminIp,
      }
    );
  }

  return c.redirect("/admin/threads", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const threadsResult = await getAllThreadsRepository({ sql, logger });
  const threads: ReadThread[] = threadsResult.isOk() ? threadsResult.value : [];

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6">
        <AdminNav currentPath="/admin/threads" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6">スレッド管理</h1>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">タイトル</th>
                <th className="p-2 text-left">状態</th>
                <th className="p-2 text-left">属性</th>
                <th className="p-2 text-left">レス数</th>
                <th className="p-2 text-left">更新日時</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => (
                <tr key={thread.id.val} className="border-t">
                  <td className="p-2 max-w-xs truncate">{thread.title.val}</td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      {thread.isStopped && thread.isPooled ? (
                        <span className="inline-block bg-purple-200 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                          アーカイブ
                        </span>
                      ) : (
                        <>
                          {thread.isStopped && (
                            <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                              停止中
                            </span>
                          )}
                          {thread.isPooled && (
                            <span className="inline-block bg-blue-200 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                              プール
                            </span>
                          )}
                        </>
                      )}
                      {!thread.isStopped && !thread.isPooled && (
                        <span className="inline-block bg-green-200 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                          通常
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      {thread.attrs.sticky && (
                        <span className="inline-block bg-orange-200 text-orange-800 text-xs font-semibold px-1 py-0.5 rounded">浮</span>
                      )}
                      {thread.attrs.sageOnly && (
                        <span className="inline-block bg-violet-200 text-violet-800 text-xs font-semibold px-1 py-0.5 rounded">sage</span>
                      )}
                      {thread.attrs.noId && (
                        <span className="inline-block bg-gray-200 text-gray-800 text-xs font-semibold px-1 py-0.5 rounded">ID無</span>
                      )}
                      {thread.attrs.force774 && (
                        <span className="inline-block bg-cyan-200 text-cyan-800 text-xs font-semibold px-1 py-0.5 rounded">名無</span>
                      )}
                      {thread.attrs.live && (
                        <span className="inline-block bg-red-200 text-red-800 text-xs font-semibold px-1 py-0.5 rounded">実</span>
                      )}
                      {thread.attrs.hideNushi && (
                        <span className="inline-block bg-pink-200 text-pink-800 text-xs font-semibold px-1 py-0.5 rounded">主無</span>
                      )}
                      {thread.attrs.noPool && (
                        <span className="inline-block bg-emerald-200 text-emerald-800 text-xs font-semibold px-1 py-0.5 rounded">プ無</span>
                      )}
                      {thread.attrs.ninpochoLevel !== undefined && thread.attrs.ninpochoLevel > 0 && (
                        <span className="inline-block bg-rose-200 text-rose-800 text-xs font-semibold px-1 py-0.5 rounded">Lv{thread.attrs.ninpochoLevel}</span>
                      )}
                      {thread.attrs.password && (
                        <span className="inline-block bg-amber-200 text-amber-800 text-xs font-semibold px-1 py-0.5 rounded">鍵</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2">{thread.countResponse}</td>
                  <td className="p-2 text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(thread.updatedAt.val)}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      <form method="post" action="/admin/threads" className="inline">
                        <input type="hidden" name="action" value="stop" />
                        <input type="hidden" name="threadId" value={thread.id.val} />
                        <button
                          type="submit"
                          className={`text-xs font-bold py-1 px-2 rounded focus:outline-none ${
                            thread.isStopped
                              ? "bg-yellow-500 hover:bg-yellow-700 text-white"
                              : "bg-gray-400 hover:bg-gray-600 text-white"
                          }`}
                        >
                          {thread.isStopped ? "停止解除" : "停止"}
                        </button>
                      </form>
                      <form method="post" action="/admin/threads" className="inline">
                        <input type="hidden" name="action" value="pool" />
                        <input type="hidden" name="threadId" value={thread.id.val} />
                        <button
                          type="submit"
                          className={`text-xs font-bold py-1 px-2 rounded focus:outline-none ${
                            thread.isPooled
                              ? "bg-blue-500 hover:bg-blue-700 text-white"
                              : "bg-gray-400 hover:bg-gray-600 text-white"
                          }`}
                        >
                          {thread.isPooled ? "プール解除" : "プール"}
                        </button>
                      </form>
                      <form
                        method="post"
                        action="/admin/threads"
                        className="inline"
                        onSubmit={(e) => { if (!confirm('このスレッドを削除してもよろしいですか？')) e.preventDefault(); }}
                      >
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="threadId" value={thread.id.val} />
                        <button
                          type="submit"
                          className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                        >
                          削除
                        </button>
                      </form>
                      {thread.isStopped && thread.isPooled ? (
                        <form method="post" action="/admin/threads" className="inline">
                          <input type="hidden" name="action" value="unarchive" />
                          <input type="hidden" name="threadId" value={thread.id.val} />
                          <button
                            type="submit"
                            className="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                          >
                            アーカイブ解除
                          </button>
                        </form>
                      ) : (
                        <form method="post" action="/admin/threads" className="inline">
                          <input type="hidden" name="action" value="archive" />
                          <input type="hidden" name="threadId" value={thread.id.val} />
                          <button
                            type="submit"
                            className="bg-gray-500 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                          >
                            アーカイブ
                          </button>
                        </form>
                      )}
                      <form method="post" action="/admin/threads" className="inline">
                        <input type="hidden" name="action" value="autodelete" />
                        <input type="hidden" name="threadId" value={thread.id.val} />
                        <input type="hidden" name="days" value="1" />
                        <button
                          type="submit"
                          className="bg-orange-500 hover:bg-orange-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none"
                        >
                          自動削除
                        </button>
                      </form>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">属性編集</summary>
                      <form method="post" action="/admin/threads" className="mt-2 bg-gray-50 p-2 rounded border text-xs">
                        <input type="hidden" name="action" value="updateAttrs" />
                        <input type="hidden" name="threadId" value={thread.id.val} />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="sticky" checked={thread.attrs.sticky || false} />
                            浮き上げ
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="sageOnly" checked={thread.attrs.sageOnly || false} />
                            sageのみ
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="noId" checked={thread.attrs.noId || false} />
                            ID非表示
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="force774" checked={thread.attrs.force774 || false} />
                            強制名無し
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="live" checked={thread.attrs.live || false} />
                            ライブ
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="hideNushi" checked={thread.attrs.hideNushi || false} />
                            スレ主非表示
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="noPool" checked={thread.attrs.noPool || false} />
                            プール禁止
                          </label>
                          <label className="flex items-center gap-1">
                            最大レス:
                            <input type="number" name="customMaxRes" defaultValue={thread.attrs.customMaxRes?.toString() || ""}
                              className="border rounded w-16 px-1" min="1" />
                          </label>
                          <label className="flex items-center gap-1">
                            名無し名:
                            <input type="text" name="custom774" defaultValue={thread.attrs.custom774 || ""}
                              className="border rounded w-24 px-1" />
                          </label>
                          <label className="flex items-center gap-1">
                            忍法帖Lv:
                            <input type="number" name="ninpochoLevel" defaultValue={thread.attrs.ninpochoLevel?.toString() || ""}
                              className="border rounded w-12 px-1" min="0" />
                          </label>
                          <label className="flex items-center gap-1">
                            スレパスワード:
                            <input type="text" name="password" defaultValue={thread.attrs.password || ""}
                              className="border rounded w-20 px-1" />
                          </label>
                          <label className="flex items-center gap-1">
                            SLIP:
                            <select name="slipLevel" defaultValue={thread.attrs.slipLevel || ""}
                              className="border rounded px-1">
                              <option value="">なし</option>
                              <option value="vvv">vvv</option>
                              <option value="vvvv">vvvv</option>
                              <option value="vvvvv">vvvvv</option>
                              <option value="vvvvvv">vvvvvv</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-1 col-span-2">
                            サブオーナーHashID:
                            <input type="text" name="subOwnerHashId" defaultValue={thread.attrs.subOwnerHashId || ""}
                              className="border rounded flex-grow px-1" />
                          </label>
                          <label className="flex items-center gap-1 col-span-2">
                             カスタム匿名名:
                             <input type="text" name="custom774_name" defaultValue={thread.attrs.custom774 || ""}
                               className="border rounded flex-grow px-1" />
                           </label>
                          <label className="flex items-center gap-1 col-span-2">
                            投稿背景色:
                            <input type="color" name="postBackground" defaultValue={(thread.attrs as ThreadAttrsDisplay).postBackground || "#ffffff"}
                              className="border rounded h-6 w-10" />
                            <input type="text" name="postBackground" defaultValue={(thread.attrs as ThreadAttrsDisplay).postBackground || ""}
                              className="border rounded w-16 px-1" />
                          </label>
                          <label className="flex items-center gap-1 col-span-2">
                            名前色:
                            <input type="color" name="nameColor" defaultValue={(thread.attrs as ThreadAttrsDisplay).nameColor || "#000000"}
                              className="border rounded h-6 w-10" />
                            <input type="text" name="nameColor" defaultValue={(thread.attrs as ThreadAttrsDisplay).nameColor || ""}
                              className="border rounded w-16 px-1" />
                          </label>
                          <label className="flex items-center gap-1 col-span-2">
                            Cap色:
                            <input type="color" name="capColor" defaultValue={(thread.attrs as ThreadAttrsDisplay).capColor || "#ff0000"}
                              className="border rounded h-6 w-10" />
                            <input type="text" name="capColor" defaultValue={(thread.attrs as ThreadAttrsDisplay).capColor || ""}
                              className="border rounded w-16 px-1" />
                          </label>
                          <div className="col-span-2 flex flex-col gap-1">
                            <label className="text-gray-600">BANリスト（1行につき1つのhash_id）:</label>
                            <textarea
                              name="bansText"
                              className="border rounded w-full h-16 px-1 font-mono text-xs"
                              defaultValue={(() => {
                                const bans = thread.attrs.bans;
                                return bans && typeof bans === "object"
                                  ? Object.keys(bans).join("\n")
                                  : "";
                              })()}
                            ></textarea>
                          </div>
                          <div className="col-span-2 flex justify-end mt-1">
                            <button
                              type="submit"
                              className="bg-purple-500 hover:bg-purple-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none"
                            >
                              属性を更新
                            </button>
                          </div>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <form method="post" action="/admin/threads">
            <input type="hidden" name="action" value="subjecttxt" />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              subject.txtを更新
            </button>
          </form>
        </div>
      </section>
    </main>
  );
});
