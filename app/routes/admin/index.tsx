import { createRoute } from "honox/factory";

import { getNormalConfigUsecase } from "../../../src/config/usecases/getNormalConfigUsecase";
import { updateNormalConfigUsecase } from "../../../src/config/usecases/updateNormalConfigUsecase";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { getAdminLogsUsecase } from "../../../src/adminlog/usecases/getAdminLogsUsecase";
import { getBoardsUsecase } from "../../../src/board/usecases/manageBoardsUsecase";
import type { AdminLogType } from "../../../src/adminlog/repositories/addAdminLogRepository";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AdminNav } from "../../components/AdminNav";
import { getIpAddress } from "../../utils/getIpAddress";
import { formatDate } from "../../../src/shared/utils/formatDate";
import HtmlPreview from "../../islands/HtmlPreview";

const safeNumber = (val: unknown, min: number, max: number, def: number): number => {
  const n = Number(val);
  return isNaN(n) ? def : Math.max(min, Math.min(max, n));
};

const MAX_HTML_SIZE = 65535;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const { sql, logger } = c.var;

  logger.info({
    operation: "admin/POST",
    path: c.req.path,
    method: c.req.method,
    message: "Starting board configuration update",
  });

  if (!sql) {
    logger.error({
      operation: "admin/POST",
      message: "Database connection not available",
    });
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  const body = await c.req.parseBody();
  const boardName = body.boardName;
  const localRule = body.localRule;
  const nanashiName = body.nanashiName;
  const maxContentLength = body.maxResponseLength;
  const maxLinesRaw = typeof body.maxLines === "string" ? body.maxLines : "30";
  const maxLineWidthRaw = typeof body.maxLineWidth === "string" ? body.maxLineWidth : "80";
  const maxAnchorsRaw = typeof body.maxAnchors === "string" ? body.maxAnchors : "10";
  const referrerCushion =
    typeof body.referrerCushion === "string" ? body.referrerCushion : "";
  let headHtml =
    typeof body.headHtml === "string" ? body.headHtml : "";
  let footHtml =
    typeof body.footHtml === "string" ? body.footHtml : "";
  let metaHtml =
    typeof body.metaHtml === "string" ? body.metaHtml : "";
  if (headHtml.length > MAX_HTML_SIZE) headHtml = headHtml.slice(0, MAX_HTML_SIZE);
  if (footHtml.length > MAX_HTML_SIZE) footHtml = footHtml.slice(0, MAX_HTML_SIZE);
  if (metaHtml.length > MAX_HTML_SIZE) metaHtml = metaHtml.slice(0, MAX_HTML_SIZE);
  const subtitle =
    typeof body.subtitle === "string" ? body.subtitle : "";
  const faviconUrl =
    typeof body.faviconUrl === "string" ? body.faviconUrl : "";
  const boardImageUrl =
    typeof body.boardImageUrl === "string" ? body.boardImageUrl : "";
  const boardImageLinkUrl =
    typeof body.boardImageLinkUrl === "string" ? body.boardImageLinkUrl : "";
  const bgColor =
    typeof body.bgColor === "string" ? body.bgColor : "#f3f4f6";
  const textColor =
    typeof body.textColor === "string" ? body.textColor : "#1f2937";
  const linkColor =
    typeof body.linkColor === "string" ? body.linkColor : "#7c3aed";
  const nameColor =
    typeof body.nameColor === "string" ? body.nameColor : "#374151";
  const enableTwitterWidgetsRaw =
    typeof body.enableTwitterWidgets === "string" ? body.enableTwitterWidgets : undefined;
  const bgColor2Raw = typeof body.bgColor2 === "string" ? body.bgColor2 : "#ffffff";
  const titleColorRaw = typeof body.titleColor === "string" ? body.titleColor : "#000000";
  const capColorRaw = typeof body.capColor === "string" ? body.capColor : "#ff0000";
  const postBgColorRaw = typeof body.postBgColor === "string" ? body.postBgColor : "#ffffff";
  const anchorColorRaw = typeof body.anchorColor === "string" ? body.anchorColor : "#0000ff";
  const indexBgColorRaw = typeof body.indexBgColor === "string" ? body.indexBgColor : "#ffffff";
  const createBgColorRaw = typeof body.createBgColor === "string" ? body.createBgColor : "#ffffff";
  const menuBgColorRaw = typeof body.menuBgColor === "string" ? body.menuBgColor : "#ffffff";
  const menuTextColorRaw = typeof body.menuTextColor === "string" ? body.menuTextColor : "#000000";
  const titleIdRaw = typeof body.titleId === "string" ? body.titleId : undefined;
  const msecDisplayRaw = typeof body.msecDisplay === "string" ? body.msecDisplay : undefined;
  const hideHitsRaw = typeof body.hideHits === "string" ? body.hideHits : undefined;
  const prTextRaw = typeof body.prText === "string" ? body.prText : "";
  const prLinkRaw = typeof body.prLink === "string" ? body.prLink : "";
  const maxNameLengthRaw = typeof body.maxNameLength === "string" ? body.maxNameLength : "20";
  const maxMailLengthRaw = typeof body.maxMailLength === "string" ? body.maxMailLength : "50";
  const maxSubjectLengthRaw = typeof body.maxSubjectLength === "string" ? body.maxSubjectLength : "100";
  const lineMaxCharsRaw = typeof body.lineMaxChars === "string" ? body.lineMaxChars : "80";
  const submaxRaw = typeof body.submax === "string" ? body.submax : "1000";
  const datmaxRaw = typeof body.datmax === "string" ? body.datmax : "1000";
  const nanashiCheckRaw = typeof body.nanashiCheck === "string" ? body.nanashiCheck : undefined;
  const sambaTimeRaw = typeof body.sambaTime === "string" ? body.sambaTime : "30";
  const houshiTimeRaw = typeof body.houshiTime === "string" ? body.houshiTime : "60";
  const tatesugiHourRaw = typeof body.tatesugiHour === "string" ? body.tatesugiHour : "24";
  const tatesugiCountRaw = typeof body.tatesugiCount === "string" ? body.tatesugiCount : "5";
  const tatesugiCloseRaw = typeof body.tatesugiClose === "string" ? body.tatesugiClose : "48";
  const tatesugiCloseCountRaw = typeof body.tatesugiCloseCount === "string" ? body.tatesugiCloseCount : "3";
  const slipEnabledRaw = typeof body.slipEnabled === "string" ? body.slipEnabled : undefined;
  const slipDefaultLevelRaw = typeof body.slipDefaultLevel === "string" ? body.slipDefaultLevel : "vvv";
  const dispIpRaw = typeof body.dispIp === "string" ? body.dispIp : undefined;
  const beEnabledRaw = typeof body.beEnabled === "string" ? body.beEnabled : undefined;
  const voteEnabledRaw = typeof body.voteEnabled === "string" ? body.voteEnabled : undefined;
  const omikujiEnabledRaw = typeof body.omikujiEnabled === "string" ? body.omikujiEnabled : undefined;
  const tasukeruyoEnabledRaw = typeof body.tasukeruyoEnabled === "string" ? body.tasukeruyoEnabled : undefined;
  const hideOpRaw = typeof body.hideOp === "string" ? body.hideOp : undefined;
  const imgTagRaw = typeof body.imgTag === "string" ? body.imgTag : undefined;
  const twitterEmbedRaw = typeof body.twitterEmbed === "string" ? body.twitterEmbed : undefined;
  const movieEmbedRaw = typeof body.movieEmbed === "string" ? body.movieEmbed : undefined;
  const urlToTitleRaw = typeof body.urlToTitle === "string" ? body.urlToTitle : undefined;
  const autoFallRaw = typeof body.autoFall === "string" ? body.autoFall : undefined;
  const captchaPerBoardRaw = typeof body.captchaPerBoard === "string" ? body.captchaPerBoard : "none";
  const usecaptchaOnAdminRaw = typeof body.usecaptchaOnAdmin === "string" ? body.usecaptchaOnAdmin : undefined;
  const highLightRaw = typeof body.highLight === "string" ? body.highLight : undefined;
  const weekdayCharsRaw = typeof body.weekdayChars === "string" ? body.weekdayChars : "日月火水木金土";
  const tripColumnRaw = typeof body.tripColumn === "string" ? body.tripColumn : "0";

  logger.debug({
    operation: "admin/POST",
    hasBoardName: typeof boardName === "string",
    hasLocalRule: typeof localRule === "string",
    hasNanashiName: typeof nanashiName === "string",
    hasMaxContentLength: typeof maxContentLength === "string",
    message: "Request body parsed for configuration update",
  });

  if (
    typeof boardName !== "string" ||
    typeof localRule !== "string" ||
    typeof nanashiName !== "string" ||
    typeof maxContentLength !== "string"
  ) {
    logger.warn({
      operation: "admin/POST",
      validationError: "Missing required fields",
      hasBoardName: typeof boardName === "string",
      hasLocalRule: typeof localRule === "string",
      hasNanashiName: typeof nanashiName === "string",
      hasMaxContentLength: typeof maxContentLength === "string",
      message:
        "Configuration update validation failed - missing required fields",
    });
    return c.render(
      <ErrorMessage error={new Error("すべての項目を入力してください")} />
    );
  }

  logger.debug({
    operation: "admin/POST",
    boardName,
    localRule,
    nanashiName,
    maxContentLength,
    message: "Calling updateConfigUsecase",
  });

  const updateConfigResult = await updateNormalConfigUsecase(
    { sql, logger },
    {
      boardNameRaw: boardName,
      localRuleRaw: localRule,
      defaultAuthorNameRaw: nanashiName,
      maxContentLengthRaw: safeNumber(maxContentLength, 1, 100000, 1000),
      maxLinesRaw: safeNumber(maxLinesRaw, 1, 500, 30),
      maxLineWidthRaw: safeNumber(maxLineWidthRaw, 1, 500, 80),
      maxAnchorsRaw: safeNumber(maxAnchorsRaw, 0, 100, 10),
      referrerCushionRaw: referrerCushion,
      headHtmlRaw: headHtml,
      footHtmlRaw: footHtml,
      metaHtmlRaw: metaHtml,
      subtitleRaw: subtitle,
      faviconUrlRaw: faviconUrl,
      boardImageUrlRaw: boardImageUrl,
      boardImageLinkUrlRaw: boardImageLinkUrl,
      bgColorRaw: bgColor,
      textColorRaw: textColor,
      linkColorRaw: linkColor,
      nameColorRaw: nameColor,
      enableTwitterWidgetsRaw: enableTwitterWidgetsRaw === "on",
      bgColor2Raw: bgColor2Raw,
      titleColorRaw: titleColorRaw,
      capColorRaw: capColorRaw,
      postBgColorRaw: postBgColorRaw,
      anchorColorRaw: anchorColorRaw,
      indexBgColorRaw: indexBgColorRaw,
      createBgColorRaw: createBgColorRaw,
      menuBgColorRaw: menuBgColorRaw,
      menuTextColorRaw: menuTextColorRaw,
      titleIdRaw: titleIdRaw === "on",
      msecDisplayRaw: msecDisplayRaw === "on",
      hideHitsRaw: hideHitsRaw === "on",
      prTextRaw: prTextRaw,
      prLinkRaw: prLinkRaw,
      maxNameLengthRaw: safeNumber(maxNameLengthRaw, 1, 100, 20),
      maxMailLengthRaw: safeNumber(maxMailLengthRaw, 1, 200, 50),
      maxSubjectLengthRaw: safeNumber(maxSubjectLengthRaw, 1, 200, 100),
      lineMaxCharsRaw: safeNumber(lineMaxCharsRaw, 1, 500, 80),
      submaxRaw: safeNumber(submaxRaw, 1, 10000, 1000),
      datmaxRaw: safeNumber(datmaxRaw, 1, 10000, 1000),
      nanashiCheckRaw: nanashiCheckRaw === "on",
      sambaTimeRaw: safeNumber(sambaTimeRaw, 0, 999999, 30),
      houshiTimeRaw: safeNumber(houshiTimeRaw, 0, 999999, 60),
      tatesugiHourRaw: safeNumber(tatesugiHourRaw, 0, 999, 24),
      tatesugiCountRaw: safeNumber(tatesugiCountRaw, 0, 999, 5),
      tatesugiCloseRaw: safeNumber(tatesugiCloseRaw, 0, 9999, 48),
      tatesugiCloseCountRaw: safeNumber(tatesugiCloseCountRaw, 0, 999, 3),
      slipEnabledRaw: slipEnabledRaw === "on",
      slipDefaultLevelRaw: slipDefaultLevelRaw,
      dispIpRaw: dispIpRaw === "on",
      beEnabledRaw: beEnabledRaw === "on",
      voteEnabledRaw: voteEnabledRaw === "on",
      omikujiEnabledRaw: omikujiEnabledRaw === "on",
      tasukeruyoEnabledRaw: tasukeruyoEnabledRaw === "on",
      hideOpRaw: hideOpRaw === "on",
      imgTagRaw: imgTagRaw === "on",
      twitterEmbedRaw: twitterEmbedRaw === "on",
      movieEmbedRaw: movieEmbedRaw === "on",
      urlToTitleRaw: urlToTitleRaw === "on",
      autoFallRaw: autoFallRaw === "on",
      captchaPerBoardRaw: captchaPerBoardRaw,
      usecaptchaOnAdminRaw: usecaptchaOnAdminRaw === "on",
      highLightRaw: highLightRaw === "on",
      weekdayCharsRaw: weekdayCharsRaw,
      tripColumnRaw: safeNumber(tripColumnRaw, 0, 100, 0),
    }
  );
  if (updateConfigResult.isErr()) {
    logger.error({
      operation: "admin/POST",
      error: updateConfigResult.error,
      message: "Configuration update failed",
    });
    return c.render(<ErrorMessage error={updateConfigResult.error} />);
  }

  const adminIp = getIpAddress(c);
  await addAdminLogUsecase(
    { sql, logger },
    {
      action: "設定更新",
      detail: `掲示板名: ${boardName}, デフォルト名: ${nanashiName}, 最大文字数: ${maxContentLength}, リファラクッション: ${referrerCushion}`,
      ipAddress: adminIp,
    }
  );

  logger.info({
    operation: "admin/POST",
    boardName,
    nanashiName,
    maxContentLength,
    message: "Configuration updated successfully, redirecting to admin page",
  });

  return c.redirect("/admin", 303);
});

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  logger.info({
    operation: "admin/GET",
    path: c.req.path,
    method: c.req.method,
    message: "Admin configuration page requested",
  });

  // 管理者画面 config関連
  if (!sql) {
    logger.error({
      operation: "admin/GET",
      message: "Database connection not available",
    });
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  logger.debug({
    operation: "admin/GET",
    message: "Fetching configuration data",
  });

  const configResult = await getNormalConfigUsecase({ sql, logger });
  if (configResult.isErr()) {
    logger.error({
      operation: "admin/GET",
      error: configResult.error,
      message: "Failed to retrieve configuration data",
    });
    return c.render(<ErrorMessage error={configResult.error} />);
  }

  const boardsResult = await getBoardsUsecase({ sql, logger });
  if (boardsResult.isErr() || boardsResult.value.length === 0) {
    logger.error({
      operation: "admin/GET",
      message: "No boards found in database",
    });
    return c.render(
      <ErrorMessage error={new Error("板が存在しません。先に板を作成してください。")} />
    );
  }

  logger.debug({
    operation: "admin/GET",
    boardName: configResult.value.boardName.val,
    message: "Configuration data retrieved successfully, rendering admin page",
  });

  const logTypeParam = c.req.query("logType") as string | undefined;
  const logType: AdminLogType | undefined = logTypeParam &&
    ["ADMIN", "ERR", "THR", "WRT", "FLR", "HST", "SMB", "SBH"].includes(logTypeParam)
    ? (logTypeParam as AdminLogType)
    : undefined;

  const logsResult = await getAdminLogsUsecase({ sql, logger }, 50, logType);
  const logs = logsResult.isOk() ? logsResult.value : [];

  const ALL_LOG_TYPES: (AdminLogType | "ALL")[] = [
    "ALL", "ADMIN", "ERR", "THR", "WRT", "FLR", "HST", "SMB", "SBH",
  ];

  // フォームの形にする
  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-10">
        <AdminNav currentPath="/admin" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">管理者画面</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">設定</h2>
        <form method="post" action="/admin" className="w-full">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label
                htmlFor="boardName"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                掲示板名
              </label>
              <input
                type="text"
                id="boardName"
                name="boardName"
                value={configResult.value.boardName.val}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="localRule"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                ルール
              </label>
              <input
                type="text"
                id="localRule"
                name="localRule"
                value={configResult.value.localRule.val}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="nanashiName"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                デフォルト名
              </label>
              <input
                type="text"
                id="nanashiName"
                name="nanashiName"
                value={configResult.value.defaultAuthorName.val}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="maxResponseLength"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                最大文字数
              </label>
              <input
                type="number"
                id="maxResponseLength"
                name="maxResponseLength"
                value={configResult.value.maxContentLength.val}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="maxLines"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                最大行数
              </label>
              <input
                type="number"
                id="maxLines"
                name="maxLines"
                value={configResult.value.maxLines}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="maxLineWidth"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                最大行幅（文字数）
              </label>
              <input
                type="number"
                id="maxLineWidth"
                name="maxLineWidth"
                value={configResult.value.maxLineWidth}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="maxAnchors"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                最大アンカー数
              </label>
              <input
                type="number"
                id="maxAnchors"
                name="maxAnchors"
                value={configResult.value.maxAnchors}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="referrerCushion"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                リファラクッションURL
              </label>
              <input
                type="text"
                id="referrerCushion"
                name="referrerCushion"
                value={configResult.value.referrerCushion}
                placeholder="https://example.com/?url={URL}"
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                URLに含まれる{"{URL}"}が実際のリンク先に置換されます
              </span>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="headHtml"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                head HTML
              </label>
              <div className="flex gap-2 mb-1">
                <HtmlPreview html={configResult.value.headHtml} id="head" />
                <button onClick={() => {
                  const ta = document.getElementById("headHtml") as HTMLTextAreaElement;
                  if (ta) ta.value = "";
                }} className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-300 dark:hover:text-red-300" type="button">デフォルトに戻す</button>
              </div>
              <textarea
                id="headHtml"
                name="headHtml"
                value={configResult.value.headHtml}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-48 font-mono text-xs"
              ></textarea>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="footHtml"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                foot HTML
              </label>
              <div className="flex gap-2 mb-1">
                <HtmlPreview html={configResult.value.footHtml} id="foot" />
                <button onClick={() => {
                  const ta = document.getElementById("footHtml") as HTMLTextAreaElement;
                  if (ta) ta.value = "";
                }} className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-300 dark:hover:text-red-300" type="button">デフォルトに戻す</button>
              </div>
              <textarea
                id="footHtml"
                name="footHtml"
                value={configResult.value.footHtml}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-48 font-mono text-xs"
              ></textarea>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="metaHtml"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                meta HTML
              </label>
              <div className="flex gap-2 mb-1">
                <HtmlPreview html={configResult.value.metaHtml} id="meta" />
                <button onClick={() => {
                  const ta = document.getElementById("metaHtml") as HTMLTextAreaElement;
                  if (ta) ta.value = "";
                }} className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-300 dark:hover:text-red-300" type="button">デフォルトに戻す</button>
              </div>
              <textarea
                id="metaHtml"
                name="metaHtml"
                value={configResult.value.metaHtml}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-48 font-mono text-xs"
              ></textarea>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="subtitle"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                サブタイトル
              </label>
              <input
                type="text"
                id="subtitle"
                name="subtitle"
                value={configResult.value.subtitle}
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="faviconUrl"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                ファビコンURL
              </label>
              <input
                type="text"
                id="faviconUrl"
                name="faviconUrl"
                value={configResult.value.faviconUrl}
                placeholder="https://example.com/favicon.svg"
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="boardImageUrl"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                看板画像URL
              </label>
              <input
                type="text"
                id="boardImageUrl"
                name="boardImageUrl"
                value={configResult.value.boardImageUrl}
                placeholder="https://example.com/board.png"
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="boardImageLinkUrl"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                看板画像リンクURL
              </label>
              <input
                type="text"
                id="boardImageLinkUrl"
                name="boardImageLinkUrl"
                value={configResult.value.boardImageLinkUrl}
                placeholder="https://example.com/"
                className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="bgColor"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                背景色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="bgColor"
                  name="bgColor"
                  value={configResult.value.bgColor}
                  className="border border-gray-400 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-10 w-16"
                />
                <input
                  type="text"
                  name="bgColor"
                  value={configResult.value.bgColor}
                  className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="textColor"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                文字色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="textColor"
                  name="textColor"
                  value={configResult.value.textColor}
                  className="border border-gray-400 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-10 w-16"
                />
                <input
                  type="text"
                  name="textColor"
                  value={configResult.value.textColor}
                  className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="linkColor"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                リンク色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="linkColor"
                  name="linkColor"
                  value={configResult.value.linkColor}
                  className="border border-gray-400 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-10 w-16"
                />
                <input
                  type="text"
                  name="linkColor"
                  value={configResult.value.linkColor}
                  className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="nameColor"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1"
              >
                投稿者名色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="nameColor"
                  name="nameColor"
                  value={configResult.value.nameColor}
                  className="border border-gray-400 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-10 w-16"
                />
                <input
                  type="text"
                  name="nameColor"
                  value={configResult.value.nameColor}
                  className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableTwitterWidgets"
                name="enableTwitterWidgets"
                checked={configResult.value.enableTwitterWidgets}
                className="h-5 w-5"
              />
              <label
                htmlFor="enableTwitterWidgets"
                className="text-gray-700 dark:text-gray-300 text-sm font-bold"
              >
                Twitterウィジェット有効
              </label>
            </div>
          </div>

          {/* カラー設定 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">カラー設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "bgColor2", label: "投稿背景色", val: configResult.value.bgColor2 },
              { id: "titleColor", label: "タイトル色", val: configResult.value.titleColor },
              { id: "capColor", label: "キャップ色", val: configResult.value.capColor },
              { id: "postBgColor", label: "記事背景色", val: configResult.value.postBgColor },
              { id: "anchorColor", label: "アンカー色", val: configResult.value.anchorColor },
              { id: "indexBgColor", label: "インデックス背景色", val: configResult.value.indexBgColor },
              { id: "createBgColor", label: "作成画面背景色", val: configResult.value.createBgColor },
              { id: "menuBgColor", label: "メニュー背景色", val: configResult.value.menuBgColor },
              { id: "menuTextColor", label: "メニュー文字色", val: configResult.value.menuTextColor },
            ].map(({ id, label, val }) => (
              <div key={id} className="flex flex-col">
                <label htmlFor={id} className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">{label}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" id={id} name={id} value={val} className="border border-gray-400 dark:border-gray-600 rounded h-10 w-16" />
                  <input type="text" name={id} value={val} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3 w-24" />
                </div>
              </div>
            ))}
          </div>

          {/* 表示設定 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">表示設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="readType" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">表示形式</label>
              <select id="readType" name="readType" value={configResult.value.readType} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3">
                <option value="5ch">5ch形式</option>
                <option value="original">オリジナル形式</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="prText" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">PRテキスト</label>
              <input type="text" id="prText" name="prText" value={configResult.value.prText} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="prLink" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">PRリンクURL</label>
              <input type="text" id="prLink" name="prLink" value={configResult.value.prLink} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="titleId" name="titleId" checked={configResult.value.titleId} className="h-5 w-5" />
              <label htmlFor="titleId" className="text-gray-700 dark:text-gray-300 text-sm font-bold">タイトルにID表示</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="msecDisplay" name="msecDisplay" checked={configResult.value.msecDisplay} className="h-5 w-5" />
              <label htmlFor="msecDisplay" className="text-gray-700 dark:text-gray-300 text-sm font-bold">ミリ秒表示</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hideHits" name="hideHits" checked={configResult.value.hideHits} className="h-5 w-5" />
              <label htmlFor="hideHits" className="text-gray-700 dark:text-gray-300 text-sm font-bold">規制情報非表示</label>
            </div>
          </div>

          {/* 文字数制限 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">文字数制限</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "maxNameLength", label: "名前最大長", val: configResult.value.maxNameLength },
              { id: "maxMailLength", label: "X ID最大長", val: configResult.value.maxMailLength },
              { id: "maxSubjectLength", label: "件名最大長", val: configResult.value.maxSubjectLength },
              { id: "lineMaxChars", label: "行最大文字数", val: configResult.value.lineMaxChars },
            ].map(({ id, label, val }) => (
              <div key={id} className="flex flex-col">
                <label htmlFor={id} className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">{label}</label>
                <input type="number" id={id} name={id} value={val} min="1" className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
              </div>
            ))}
          </div>

          {/* スレッド制限 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">スレッド制限</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="submax" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">最大スレッド数</label>
              <input type="number" id="submax" name="submax" value={configResult.value.submax} min="1" className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="datmax" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">最大スレッドサイズ(KB)</label>
              <input type="number" id="datmax" name="datmax" value={configResult.value.datmax} min="1" className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="nanashiCheck" name="nanashiCheck" checked={configResult.value.nanashiCheck} className="h-5 w-5" />
              <label htmlFor="nanashiCheck" className="text-gray-700 dark:text-gray-300 text-sm font-bold">名無しチェック有効</label>
            </div>
          </div>

          {/* 規制設定 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">規制設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "sambaTime", label: "サンバ規制間隔(秒)", val: configResult.value.sambaTime },
              { id: "houshiTime", label: "放置ペナルティ時間(分)", val: configResult.value.houshiTime },
              { id: "tatesugiHour", label: "連続投稿監視時間(時間)", val: configResult.value.tatesugiHour },
              { id: "tatesugiCount", label: "連続投稿許容回数", val: configResult.value.tatesugiCount },
              { id: "tatesugiClose", label: "連続投稿規制時間(時間)", val: configResult.value.tatesugiClose },
              { id: "tatesugiCloseCount", label: "連続投稿規制回数", val: configResult.value.tatesugiCloseCount },
            ].map(({ id, label, val }) => (
              <div key={id} className="flex flex-col">
                <label htmlFor={id} className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">{label}</label>
                <input type="number" id={id} name={id} value={val} min="0" className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
              </div>
            ))}
          </div>

          {/* 機能設定 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">機能設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="slipEnabled" name="slipEnabled" checked={configResult.value.slipEnabled} className="h-5 w-5" />
              <label htmlFor="slipEnabled" className="text-gray-700 dark:text-gray-300 text-sm font-bold">スリップ有効</label>
            </div>
            <div className="flex flex-col">
              <label htmlFor="slipDefaultLevel" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">スリップデフォルトレベル</label>
              <select id="slipDefaultLevel" name="slipDefaultLevel" value={configResult.value.slipDefaultLevel} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3">
                <option value="vvv">vvv</option>
                <option value="vvvvv">vvvvv</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dispIp" name="dispIp" checked={configResult.value.dispIp} className="h-5 w-5" />
              <label htmlFor="dispIp" className="text-gray-700 dark:text-gray-300 text-sm font-bold">IP表示</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="beEnabled" name="beEnabled" checked={configResult.value.beEnabled} className="h-5 w-5" />
              <label htmlFor="beEnabled" className="text-gray-700 dark:text-gray-300 text-sm font-bold">BE有効</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="voteEnabled" name="voteEnabled" checked={configResult.value.voteEnabled} className="h-5 w-5" />
              <label htmlFor="voteEnabled" className="text-gray-700 dark:text-gray-300 text-sm font-bold">投票有効</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="omikujiEnabled" name="omikujiEnabled" checked={configResult.value.omikujiEnabled} className="h-5 w-5" />
              <label htmlFor="omikujiEnabled" className="text-gray-700 dark:text-gray-300 text-sm font-bold">おみくじ有効</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tasukeruyoEnabled" name="tasukeruyoEnabled" checked={configResult.value.tasukeruyoEnabled} className="h-5 w-5" />
              <label htmlFor="tasukeruyoEnabled" className="text-gray-700 dark:text-gray-300 text-sm font-bold">たすけるよ有効</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hideOp" name="hideOp" checked={configResult.value.hideOp} className="h-5 w-5" />
              <label htmlFor="hideOp" className="text-gray-700 dark:text-gray-300 text-sm font-bold">スレ主非表示</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="imgTag" name="imgTag" checked={configResult.value.imgTag} className="h-5 w-5" />
              <label htmlFor="imgTag" className="text-gray-700 dark:text-gray-300 text-sm font-bold">IMGタグ有効</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="twitterEmbed" name="twitterEmbed" checked={configResult.value.twitterEmbed} className="h-5 w-5" />
              <label htmlFor="twitterEmbed" className="text-gray-700 dark:text-gray-300 text-sm font-bold">Twitter埋め込み</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="movieEmbed" name="movieEmbed" checked={configResult.value.movieEmbed} className="h-5 w-5" />
              <label htmlFor="movieEmbed" className="text-gray-700 dark:text-gray-300 text-sm font-bold">動画埋め込み</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="urlToTitle" name="urlToTitle" checked={configResult.value.urlToTitle} className="h-5 w-5" />
              <label htmlFor="urlToTitle" className="text-gray-700 dark:text-gray-300 text-sm font-bold">URL→タイトル変換</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoFall" name="autoFall" checked={configResult.value.autoFall} className="h-5 w-5" />
              <label htmlFor="autoFall" className="text-gray-700 dark:text-gray-300 text-sm font-bold">自動フォール(完了スレ自動保管)</label>
            </div>
            <div className="flex flex-col">
              <label htmlFor="captchaPerBoard" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">板別キャプチャ</label>
              <select id="captchaPerBoard" name="captchaPerBoard" value={configResult.value.captchaPerBoard} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3">
                <option value="none">なし</option>
                <option value="checked">チェック付き</option>
                <option value="force">強制</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="usecaptchaOnAdmin" name="usecaptchaOnAdmin" checked={configResult.value.usecaptchaOnAdmin} className="h-5 w-5" />
              <label htmlFor="usecaptchaOnAdmin" className="text-gray-700 dark:text-gray-300 text-sm font-bold">管理者キャプチャ有効</label>
            </div>
          </div>

          {/* 文字設定 */}
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 border-b pb-1">文字設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="highLight" name="highLight" checked={configResult.value.highLight} className="h-5 w-5" />
              <label htmlFor="highLight" className="text-gray-700 dark:text-gray-300 text-sm font-bold"># と &gt; ハイライト</label>
            </div>
            <div className="flex flex-col">
              <label htmlFor="weekdayChars" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">曜日文字</label>
              <input type="text" id="weekdayChars" name="weekdayChars" value={configResult.value.weekdayChars} className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="tripColumn" className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">トリップ桁揃え位置</label>
              <input type="number" id="tripColumn" name="tripColumn" value={configResult.value.tripColumn} min="0" className="border border-gray-400 dark:border-gray-600 rounded py-2 px-3" />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="w-60 bg-purple-500 dark:bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              更新
            </button>
          </div>
          <div className="mt-4 flex justify-end gap-4">
            <a href="/admin/archive" className="text-blue-500 dark:text-blue-400 underline">
              アーカイブ管理
            </a>
            <a href="/admin/password" className="text-blue-500 dark:text-blue-400 underline">
              パスワード変更
            </a>
          </div>
        </form>
      </section>
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">操作ログ</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {ALL_LOG_TYPES.map((type) => (
            <a
              key={type}
              href={type === "ALL" ? "/admin" : `/admin?logType=${type}`}
              className={`px-3 py-1 rounded text-sm font-medium ${
                (type === "ALL" && !logType) || type === logType
                  ? "bg-purple-500 dark:bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
              }`}
            >
              {type}
            </a>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-900">
                <th className="p-2 text-left">日時</th>
                <th className="p-2 text-left">種別</th>
                <th className="p-2 text-left">操作</th>
                <th className="p-2 text-left">詳細</th>
                <th className="p-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${log.logType === "ERR" ? "bg-red-100 text-red-800 dark:text-red-300" : log.logType === "SBH" ? "bg-orange-100 text-orange-800" : log.logType === "SMB" ? "bg-yellow-100 text-yellow-800" : log.logType === "HST" ? "bg-pink-100 text-pink-800" : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"}`}>
                      {log.logType}
                    </span>
                  </td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{log.detail}</td>
                  <td className="p-2">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
});
