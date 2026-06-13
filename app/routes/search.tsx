import { createRoute } from "honox/factory";

import { searchUsecase } from "../../src/search/usecases/searchUsecase";
import { getNormalConfigUsecase } from "../../src/config/usecases/getNormalConfigUsecase";
import { getBoardsUsecase } from "../../src/board/usecases/manageBoardsUsecase";
import { formatDate } from "../../src/shared/utils/formatDate";
import { ErrorMessage } from "../components/ErrorMessage";

const SEARCH_TYPES = [
  { value: 1, label: "名前" },
  { value: 2, label: "本文" },
  { value: 4, label: "ID" },
  { value: 8, label: "スレッドタイトル" },
];

export default createRoute(async (c) => {
  const { sql, logger } = c.var;
  const keyword = c.req.query("q") || "";
  const rawType = c.req.query("type") || "15";
  const searchType = parseInt(rawType, 10) || 15;
  const dateFrom = c.req.query("from") || "";
  const dateTo = c.req.query("to") || "";
  const rawBoardId = c.req.query("board") || "";
  const page = parseInt(c.req.query("page") || "1", 10) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  let boards: { id: string; boardKey: string; boardName: string }[] = [];
  const boardsResult = await getBoardsUsecase({ sql, logger });
  if (boardsResult.isOk()) {
    boards = boardsResult.value.map((b) => ({ id: b.id, boardKey: b.boardKey, boardName: b.boardName }));
  }

  logger.info({
    operation: "search/GET",
    keyword,
    searchType,
    dateFrom,
    dateTo,
    page,
    message: "Search page requested",
  });

  const configResult = await getNormalConfigUsecase({ sql, logger });
  const searchCaptchaEnabled = configResult.isOk() && configResult.value.searchCaptchaEnabled;

  let results: { items: { type: string; threadId: string; threadTitle: string; responseNumber?: number; authorName?: string; content: string; postedAt: Date; hashId?: string }[]; total: number } | null = null;
  let error: Error | null = null;

  if (keyword.trim().length > 0) {
    const searchResult = await searchUsecase(
      { sql, logger },
      {
        keyword: keyword.trim(),
        searchType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit,
        offset,
        boardId: rawBoardId || undefined,
      }
    );
    if (searchResult.isErr()) {
      error = searchResult.error;
    } else {
      results = searchResult.value;
    }
  }

  const totalPages = results ? Math.ceil(results.total / limit) : 0;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">検索</h1>

        <div className="flex flex-wrap gap-8">
          <div className="flex-1 min-w-[280px]">
            <form method="get" action="/search" className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="q"
                  value={keyword}
                  placeholder="検索キーワードを入力..."
                  className="border border-gray-400 rounded py-2 px-3 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input type="hidden" name="type" value={rawType} />
                <input type="hidden" name="page" value="1" />
                <input type="hidden" name="board" value={rawBoardId} />
                <button
                  type="submit"
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none"
                >
                  検索
                </button>
              </div>

              <fieldset className="border border-gray-300 rounded p-3">
                <legend className="text-sm font-semibold text-gray-700 px-1">検索対象</legend>
                <div className="flex flex-wrap gap-3 mt-1">
                  {SEARCH_TYPES.map((st) => {
                    const checked = (searchType & st.value) !== 0;
                    const newType = checked ? searchType & ~st.value : searchType | st.value;
                    return (
                      <label key={st.value} className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.set("type", String(newType));
                            url.searchParams.set("page", "1");
                            window.location.href = url.toString();
                          }}
                        />
                        {st.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <label className="text-sm text-gray-700">FROM:</label>
                  <input
                    type="date"
                    name="from"
                    value={dateFrom}
                    className="border border-gray-400 rounded py-1 px-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-sm text-gray-700">TO:</label>
                  <input
                    type="date"
                    name="to"
                    value={dateTo}
                    className="border border-gray-400 rounded py-1 px-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-sm text-gray-700">板:</label>
                  <select
                    name="board"
                    value={rawBoardId}
                    onChange={(e) => {
                      const target = e.currentTarget as HTMLSelectElement;
                      const url = new URL(window.location.href);
                      url.searchParams.set("board", target.value);
                      url.searchParams.set("page", "1");
                      window.location.href = url.toString();
                    }}
                    className="border border-gray-400 rounded py-1 px-2 text-sm focus:outline-none"
                  >
                    <option value="">全ての板</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>{b.boardName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {searchCaptchaEnabled && (
                <div className="text-xs text-gray-500">
                  CAPTCHA verification enabled for search
                </div>
              )}
            </form>
          </div>

          <aside className="w-48 border-l border-gray-200 pl-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3">板一覧</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><a href="/search" className="text-purple-600 hover:underline">全ての板</a></li>
              {boards.map((b) => (
                <li key={b.id}>
                  <a
                    href={`/search?board=${b.id}`}
                    className={`hover:underline ${rawBoardId === b.id ? "text-purple-600 font-semibold" : "text-gray-600"}`}
                  >
                    {b.boardName}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {error && <ErrorMessage error={error} />}

        {results && (
          <div className="mt-6">
            <p className="text-gray-600 mb-4">検索結果: {results.total}件 (page {page}/{totalPages || 1})</p>
            {results.items.length === 0 ? (
              <p className="text-gray-500">該当する結果がありませんでした。</p>
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {results.items.map((item, index) => (
                    <li key={index} className="bg-gray-50 p-4 rounded-md">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500">
                          [{item.type === "thread" ? "スレッド" : "レス"}]
                        </span>
                        <a
                          href={
                            item.type === "thread"
                              ? `/threads/${item.threadId}/l50`
                              : `/threads/${item.threadId}/${item.responseNumber || ""}`
                          }
                          className="text-purple-600 hover:underline font-semibold"
                        >
                          {item.threadTitle}
                        </a>
                        {item.responseNumber && (
                          <span className="text-sm text-gray-500">
                            No.{item.responseNumber}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatDate(item.postedAt, {
                            acceptLanguage: c.req.header("Accept-Language") ?? undefined,
                          })}
                        </span>
                      </div>
                      {item.authorName && (
                        <div className="text-sm text-gray-600 mb-1">
                          名前: {item.authorName}
                          {item.hashId && <span> ID: {item.hashId}</span>}
                        </div>
                      )}
                      <div className="text-gray-800 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {item.content.length > 200
                          ? item.content.substring(0, 200) + "..."
                          : item.content}
                      </div>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    {page > 1 && (
                      <a
                        href={`/search?q=${encodeURIComponent(keyword)}&type=${rawType}&from=${dateFrom}&to=${dateTo}&page=${page - 1}${rawBoardId ? `&board=${rawBoardId}` : ""}`}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded text-sm"
                      >
                        前へ
                      </a>
                    )}
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                      const startPage = Math.max(1, Math.min(page - 5, totalPages - 9));
                      const p = startPage + i;
                      if (p > totalPages) return null;
                      return (
                        <a
                          key={p}
                          href={`/search?q=${encodeURIComponent(keyword)}&type=${rawType}&from=${dateFrom}&to=${dateTo}&page=${p}${rawBoardId ? `&board=${rawBoardId}` : ""}`}
                          className={`py-1 px-3 rounded text-sm ${p === page ? "bg-purple-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                        >
                          {p}
                        </a>
                      );
                    })}
                    {page < totalPages && (
                      <a
                        href={`/search?q=${encodeURIComponent(keyword)}&type=${rawType}&from=${dateFrom}&to=${dateTo}&page=${page + 1}${rawBoardId ? `&board=${rawBoardId}` : ""}`}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded text-sm"
                      >
                        次へ
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
});
