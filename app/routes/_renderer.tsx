import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { raw } from "hono/html";

import { getNormalConfigUsecase } from "../../src/config/usecases/getNormalConfigUsecase";
import { getBoardConfigUsecase } from "../../src/config/usecases/getBoardConfigUsecase";
import { getBannersUsecase } from "../../src/banner/usecases/manageBannersUsecase";
import { getActiveNoticesForUserUsecase } from "../../src/notice/usecases/getActiveNoticesForUserUsecase";
import { generateNinpochoHashId } from "../../src/ninpocho/utils/generateNinpochoHashId";
import { getBoardsUsecase } from "../../src/board/usecases/manageBoardsUsecase";
import { VAK_VERSION_DISPLAY } from "../../src/shared/version";
import { ErrorMessage } from "../components/ErrorMessage";
import { getIpAddress } from "../utils/getIpAddress";
import ImageOverlay from "../islands/ImageOverlay";
import MobileMenu from "../islands/MobileMenu";

export default jsxRenderer(async ({ children }) => {
  const c = useRequestContext();

  const { sql, logger } = c.var;
  const configResult = await getBoardConfigUsecase({
    sql,
    logger,
  });

  if (configResult.isErr()) {
    console.error(configResult.error.message);
    return <ErrorMessage error={configResult.error} />;
  }

  let headHtml = "";
  let footHtml = "";
  let metaHtml = "";
  let subtitle = "";
  let faviconUrl = "";
  let boardImageUrl = "";
  let boardImageLinkUrl = "";
  let bgColor = "#f3f4f6";
  let textColor = "#1f2937";
  let linkColor = "#7c3aed";
  let nameColor = "#374151";
  let enableTwitterWidgets = false;
  try {
    const normalConfigResult = await getNormalConfigUsecase({ sql, logger });
    if (normalConfigResult.isOk()) {
      headHtml = normalConfigResult.value.headHtml || "";
      footHtml = normalConfigResult.value.footHtml || "";
      metaHtml = normalConfigResult.value.metaHtml || "";
      subtitle = normalConfigResult.value.subtitle || "";
      faviconUrl = normalConfigResult.value.faviconUrl || "";
      boardImageUrl = normalConfigResult.value.boardImageUrl || "";
      boardImageLinkUrl = normalConfigResult.value.boardImageLinkUrl || "";
      bgColor = normalConfigResult.value.bgColor || "#f3f4f6";
      textColor = normalConfigResult.value.textColor || "#1f2937";
      linkColor = normalConfigResult.value.linkColor || "#7c3aed";
      nameColor = normalConfigResult.value.nameColor || "#374151";
      enableTwitterWidgets = normalConfigResult.value.enableTwitterWidgets || false;
    }
  } catch (e) {
    console.error("Failed to load config:", e);
  }

  let banners: { id: string; name: string; imageUrl: string; linkUrl: string }[] = [];
  try {
    const bannersResult = await getBannersUsecase({ sql, logger });
    if (bannersResult.isOk()) {
      banners = bannersResult.value.map((b) => ({
        id: b.id,
        name: b.name,
        imageUrl: b.imageUrl,
        linkUrl: b.linkUrl,
      }));
    }
  } catch (e) {
    console.error("Failed to load banners:", e);
  }

  let notices: { title: string; content: string }[] = [];
  try {
    const ip = getIpAddress(c);
    const hashId = generateNinpochoHashId(ip);
    const host = c.req.header("Host") ?? "";
    const noticesResult = await getActiveNoticesForUserUsecase(
      { sql, logger },
      { ip, host, hashId }
    );
    if (noticesResult.isOk()) {
      notices = noticesResult.value.map((n) => ({
        title: n.title,
        content: n.content,
      }));
    }
  } catch (e) {
    console.error("Failed to load notices:", e);
  }

  let boards: { boardKey: string; boardName: string }[] = [];
  try {
    const boardsResult = await getBoardsUsecase({ sql, logger });
    if (boardsResult.isOk()) {
      boards = boardsResult.value.map((b) => ({
        boardKey: b.boardKey,
        boardName: b.boardName,
      }));
    }
  } catch (e) {
    console.error("Failed to load boards:", e);
  }

  const currentBoardKey = c.get("board")?.boardKey || "main";

  return (
    <html lang="ja" class="">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{configResult.value.boardName.val}</title>
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" />
        {/* OGP meta tags */}
        <meta property="og:title" content={configResult.value.boardName.val} />
        <meta property="og:description" content={subtitle || configResult.value.localRule.val} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={configResult.value.boardName.val} />
        {boardImageUrl && <meta property="og:image" content={boardImageUrl} />}
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        {/* CSP */}
        <meta http-equiv="Content-Security-Policy" content="frame-src 'self' https://www.nicovideo.jp/ https://www.youtube.com/ https://imgur.com/ https://platform.twitter.com/;" />
        {/* Favicon */}
        <link rel="icon" href={faviconUrl || "/favicon.svg"} type="image/svg+xml" />
        {/* Twitter widgets */}
        {enableTwitterWidgets && <script src="https://platform.twitter.com/widgets.js" async />}
        {metaHtml && raw(metaHtml)}
        {headHtml && raw(headHtml)}
      </head>
      <body style={{
        backgroundColor: bgColor,
        color: textColor,
      }}>
        <div className="flex flex-col min-h-screen bg-gray-100 font-aahub-light4">
          <header className="bg-gradient-to-r from-purple-500 to-orange-200 text-white w-full py-4 px-6">
            <div className="container mx-auto flex items-center justify-between">
              <div>
                <a className="text-3xl font-bold" href="/">
                  {configResult.value.boardName.val}
                </a>
                <p className="text-sm">{configResult.value.localRule.val}</p>
                {boardImageUrl && (
                  <div className="text-center mt-2">
                    {boardImageLinkUrl ? (
                      <a href={boardImageLinkUrl}>
                        <img src={boardImageUrl} alt={configResult.value.boardName.val} className="max-h-24 mx-auto" />
                      </a>
                    ) : (
                      <img src={boardImageUrl} alt={configResult.value.boardName.val} className="max-h-24 mx-auto" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {boards.length > 1 && (
                  <div className="flex gap-2 text-xs">
                    {boards.map((b) => (
                      <a
                        key={b.boardKey}
                        href={`/?board=${b.boardKey}`}
                        className={`px-2 py-0.5 rounded ${
                          b.boardKey === currentBoardKey
                            ? "bg-white text-purple-700 font-bold"
                            : "bg-purple-400 text-white hover:bg-purple-300"
                        }`}
                      >
                        {b.boardName}
                      </a>
                    ))}
                  </div>
                )}
                <nav className="hidden md:flex gap-4 text-sm items-center">
                  <a href={"/search" + (currentBoardKey !== "main" ? `?board=${currentBoardKey}` : "")} className="hover:underline">検索</a>
                  <a href={"/subback.html" + (currentBoardKey !== "main" ? `?board=${currentBoardKey}` : "")} className="hover:underline">スレッド一覧</a>
                  <a href="/timeline" className="hover:underline">タイムライン</a>
                  <a href="/archive" className="hover:underline">過去ログ</a>
                  <a href="/gold_ranking" className="hover:underline">ゴールドランキング</a>
                  <a href="/madakana" className="hover:underline">規制情報</a>
                  <a href="/admin" className="hover:underline">管理</a>
                </nav>
              </div>
              <button id="mobile-menu-toggle" className="md:hidden flex flex-col gap-1 p-2">
                <span className="block w-6 h-0.5 bg-white"></span>
                <span className="block w-6 h-0.5 bg-white"></span>
                <span className="block w-6 h-0.5 bg-white"></span>
              </button>
              <MobileMenu />
            </div>
            <div id="mobile-menu" className="hidden md:hidden bg-purple-600 text-white p-4">
              <nav className="flex flex-col gap-2">
                <a href={"/search" + (currentBoardKey !== "main" ? `?board=${currentBoardKey}` : "")} className="hover:underline">検索</a>
                <a href={"/subback.html" + (currentBoardKey !== "main" ? `?board=${currentBoardKey}` : "")} className="hover:underline">スレッド一覧</a>
                <a href="/timeline" className="hover:underline">タイムライン</a>
                <a href="/archive" className="hover:underline">過去ログ</a>
                <a href="/gold_ranking" className="hover:underline">ゴールドランキング</a>
                <a href="/madakana" className="hover:underline">規制情報</a>
                <a href="/admin" className="hover:underline">管理</a>
              </nav>
            </div>
          </header>

          {banners.length > 0 && (
            <div className="bg-white border-b border-gray-200">
              <div className="container mx-auto py-3 px-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {banners.map((banner) => (
                    banner.linkUrl ? (
                      <a
                        key={banner.id}
                        href={banner.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={banner.imageUrl}
                          alt={banner.name}
                          className="h-12 object-contain rounded hover:opacity-80 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <img
                        key={banner.id}
                        src={banner.imageUrl}
                        alt={banner.name}
                        className="h-12 object-contain rounded"
                        loading="lazy"
                      />
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {notices.length > 0 && (
            <div className="bg-yellow-50 border-b border-yellow-200">
              <div className="container mx-auto py-3 px-4">
                {notices.map((notice) => (
                  <div key={notice.title} className="mb-1 last:mb-0">
                    <strong className="text-yellow-800">{notice.title}:</strong>{" "}
                    <span className="text-yellow-700">{notice.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {children}
          <ImageOverlay />
        </div>
        <footer className="text-center text-xs text-gray-500 py-4">
          {VAK_VERSION_DISPLAY}
        </footer>
        {footHtml && raw(footHtml)}
      </body>
    </html>
  );
});
