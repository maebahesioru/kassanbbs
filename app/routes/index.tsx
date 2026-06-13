import { createRoute } from "honox/factory";

import { formatReadAuthorName } from "../../src/conversation/domain/read/ReadAuthorName";
import { isSage } from "../../src/conversation/domain/write/WriteMail";
import { getTopPageUsecase } from "../../src/conversation/usecases/getTopPageUsecase";
import { getNormalConfigUsecase } from "../../src/config/usecases/getNormalConfigUsecase";
import { formatDate } from "../../src/shared/utils/formatDate";
import { ErrorMessage } from "../components/ErrorMessage";
import { ResponseContentComponent } from "../components/ResponseContent";
import FormEnhance from "../islands/FormEnhance";
import CaptchaWidget from "../islands/CaptchaWidget";
import BrowserFingerprint from "../islands/BrowserFingerprint";
import ImageOverlay from "../islands/ImageOverlay";
import TimeAgo from "../islands/TimeAgo";
import ClearFileButton from "../islands/ClearFileButton";
import { getUserCookieData } from "../utils/userCookieManager";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;
  const boardId = c.get("boardId");

  logger.info({
    operation: "index/GET",
    path: c.req.path,
    method: c.req.method,
    boardId,
    message: "Rendering top page",
  });

  logger.debug({
    operation: "index/GET",
    message: "Calling getTopPageUsecase to retrieve data",
  });

  const usecaseResult = await getTopPageUsecase({
    sql,
    logger,
  }, boardId);

  if (usecaseResult.isErr()) {
    logger.error({
      operation: "index/GET",
      error: usecaseResult.error,
      message: "Failed to retrieve top page data",
    });
    return c.render(<ErrorMessage error={usecaseResult.error} />);
  }

  const configResult = await getNormalConfigUsecase({ sql, logger });
  const captchaProvider = configResult.isOk() ? configResult.value.captchaProvider : "none";
  const captchaEnabled = captchaProvider && captchaProvider !== "none";
  const captchaSiteKey = configResult.isOk() ? configResult.value.captchaSiteKey : "";
  const linkColor = configResult.isOk() ? configResult.value.linkColor || "#7c3aed" : "#7c3aed";
  const nameColor = configResult.isOk() ? configResult.value.nameColor || "#374151" : "#374151";

  const { threadTop30, responsesTop10 } = usecaseResult.value;

  const userCookie = getUserCookieData(c);

  logger.debug({
    operation: "index/GET",
    threadCount: threadTop30.length,
    topThreadCount: responsesTop10.length,
    message: "Successfully retrieved top page data, rendering page",
  });

  return c.render(
    <>
      <main className="container mx-auto flex-grow py-8 px-4">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">人気スレッド</h2>
          </div>
          <ul className="flex flex-wrap gap-4">
            {threadTop30.map((thread, index) => (
              <li key={thread.id.val} className="flex-none max-w-md">
                <a
                  className="text-purple-600 dark:text-purple-400 underline whitespace-normal break-words"
                  href={
                    index < 10
                      ? `#thread-${thread.id.val}`
                      : `/threads/${thread.id.val}/l50`
                  }
                >
                  {index + 1}: {thread.title.val} ({thread.countResponse})
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <a href="/subback.html" className="text-blue-600 dark:text-blue-400 hover:underline">
              全スレッド一覧
            </a>
          </div>
        </section>

        <section className="mb-8">
          <ul className="flex flex-col gap-4">
            {responsesTop10.map((threadResp, threadIndex) => (
              <li
                id={`thread-${threadResp.thread.id.val}`}
                key={threadResp.thread.id.val}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 pb-4 flex-none "
              >
                <h3 className="text-purple-600 dark:text-purple-400 font-bold text-xl whitespace-normal break-words">
                  【{threadIndex + 1}:{threadResp.thread.countResponse}】{" "}
                  {threadResp.thread.title.val}
                </h3>
                <ul className="flex flex-col gap-2 mt-2">
                  {threadResp.responses.map((resp) => (
                    <li
                      key={resp.responseId.val}
                      id={`${resp.threadId.val}-${resp.responseNumber.val}`}
                      className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold">
                          {resp.responseNumber.val}
                        </span>
                        <span
                          className={`text-gray-700 dark:text-gray-300 ${
                            isSage(resp.mail) ? "text-violet-600" : ""
                          }`}
                          style={{ color: resp.authorName.val.color || nameColor }}
                        >
                          名前: {formatReadAuthorName(resp.authorName, resp.capcode)}
                        </span>
                        {resp.isOwner && (
                          <span className="text-red-600 dark:text-red-400 font-bold">(主)</span>
                        )}
                        {resp.isSubOwner && (
                          <span className="text-orange-600 dark:text-orange-400 font-bold">(副)</span>
                        )}
                        <span className="text-gray-500 dark:text-gray-400 text-sm" data-mtime={Math.floor(resp.postedAt.val.getTime() / 1000)}>
                          {formatDate(resp.postedAt.val, {
                            acceptLanguage:
                              c.req.header("Accept-Language") ?? undefined,
                          })}
                        </span>
                        {resp.dailyId && (
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            ID: {resp.dailyId}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800 dark:text-gray-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
                        <ResponseContentComponent
                          threadId={resp.threadId}
                          responseContent={resp.responseContent}
                          mail={resp.mail}
                          authorName={resp.authorName}
                          referrerCushion={
                            configResult.isOk()
                              ? configResult.value.referrerCushion || undefined
                              : undefined
                          }
                          dailyId={resp.dailyId}
                          isOwner={resp.isOwner}
                          isSubOwner={resp.isSubOwner}
                          linkColor={linkColor}
                          nameColor={resp.authorName.val.color || nameColor}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="m-4 p-2 rounded-md">
                  <h3 className="text-xl font-semibold mb-4">返信する</h3>
                  <form
                    method="post"
                    action={`/threads/${threadResp.thread.id.val}/responses`}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 md:w-1/2">
                        名前:
                        <input
                          type="text"
                          name="name"
                          value={userCookie.name}
                          className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </label>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 md:w-1/2">
                        X ID:
                          <input
                            type="text"
                            name="mail"
                            value={userCookie.mail}
                            placeholder="@username"
                          className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                        本文:
                        <textarea
                          name="content"
                          required
                          className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32"
                        ></textarea>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="bg-purple-500 dark:bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      書き込む
                    </button>
                    {captchaEnabled && (
                      <>
                        <CaptchaWidget siteKey={captchaSiteKey} provider={captchaProvider} />
                      </>
                    )}
                    {/* Add the FormEnhance island */}
                    <FormEnhance />
                    <BrowserFingerprint />
                  </form>
                  <div className="flex gap-4 mt-2">
                    <a
                      href={`/threads/${threadResp.thread.id.val}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      全部読む
                    </a>
                    <a
                      href={`/threads/${threadResp.thread.id.val}/l50`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      最新50件
                    </a>
                    <a
                      href={`/threads/${threadResp.thread.id.val}/1-100`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      1-100
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="new-thread-form"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <h2 className="text-2xl font-semibold mb-4">新規スレッド作成</h2>
          <form method="post" action="/threads" className="flex flex-col gap-2">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                スレッドタイトル:
                <input
                  type="text"
                  name="title"
                  required
                  className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 md:w-1/2">
                名前:
                <input
                  type="text"
                  name="name"
                  value={userCookie.name}
                  className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 md:w-1/2">
                X ID:
                <input
                  type="text"
                  name="mail"
                  value={userCookie.mail}
                  placeholder="@username"
                  className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                本文:
                <textarea
                  name="content"
                  required
                  className="border border-gray-400 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32"
                ></textarea>
              </label>
            </div>
            <button
              type="submit"
              className="bg-purple-500 dark:bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              新規スレッド作成
            </button>
            {captchaEnabled && (
              <>
                <CaptchaWidget siteKey={captchaSiteKey} provider={captchaProvider} />
              </>
            )}
            {/* Add the FormEnhance island */}
            <FormEnhance />
            <BrowserFingerprint />
          </form>
        </section>
      </main>
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50">
        <a
          href="#new-thread-form"
          className="
            bg-purple-500 dark:bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-800 text-white 
            p-4 md:p-6            
            lg:p-5               
            rounded-full shadow-lg focus:outline-none transition 
            text-2xl md:text-4xl
            lg:text-3xl        
          "
        >
          ＋
        </a>
      </div>
      <ImageOverlay />
      <TimeAgo />
      <ClearFileButton />
    </>
  );
});
