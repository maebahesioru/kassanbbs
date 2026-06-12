import { err, ok } from "neverthrow";
import { Result } from "neverthrow";

import { createWriteBoardName } from "../domain/write/WriteBoardName";
import { createWriteDefaultAuthorName } from "../domain/write/WriteDefaultAuthorName";
import { createWriteLocalRule } from "../domain/write/WriteLocalRule";
import { createWriteMaxContentLength } from "../domain/write/WriteMaxContentLength";
import { createWriteNormalConfig } from "../domain/write/WriteNormalConfig";
import { updateNormalConfigRepository } from "../repositories/updateNormalConfigRepository";

import type { VakContext } from "../../shared/types/VakContext";

export const updateNormalConfigUsecase = async (
  vakContext: VakContext,
  {
    boardNameRaw,
    localRuleRaw,
    defaultAuthorNameRaw,
    maxContentLengthRaw,
    maxLinesRaw,
    maxLineWidthRaw,
    maxAnchorsRaw,
    captchaProviderRaw,
    captchaSiteKeyRaw,
    captchaSecretKeyRaw,
    enableDnsblRaw,
    dnsblHostnamesRaw,
    enableVpnDetectionRaw,
    referrerCushionRaw,
    headHtmlRaw,
    footHtmlRaw,
    metaHtmlRaw,
    subtitleRaw,
    faviconUrlRaw,
    boardImageUrlRaw,
    boardImageLinkUrlRaw,
    bgColorRaw,
    textColorRaw,
    linkColorRaw,
    nameColorRaw,
    enableTwitterWidgetsRaw,
    limitmeEnabledRaw,
    limitmeFromRaw,
    limitmeToRaw,
    searchCaptchaEnabledRaw,
    readTypeRaw,
    autoDiscoverThreadsRaw,
    bgColor2Raw,
    titleColorRaw,
    capColorRaw,
    postBgColorRaw,
    anchorColorRaw,
    indexBgColorRaw,
    createBgColorRaw,
    menuBgColorRaw,
    menuTextColorRaw,
    titleIdRaw,
    msecDisplayRaw,
    hideHitsRaw,
    prTextRaw,
    prLinkRaw,
    maxNameLengthRaw,
    maxMailLengthRaw,
    maxSubjectLengthRaw,
    lineMaxCharsRaw,
    submaxRaw,
    datmaxRaw,
    nanashiCheckRaw,
    sambaTimeRaw,
    houshiTimeRaw,
    tatesugiHourRaw,
    tatesugiCountRaw,
    tatesugiCloseRaw,
    tatesugiCloseCountRaw,
    slipEnabledRaw,
    slipDefaultLevelRaw,
    dispIpRaw,
    beEnabledRaw,
    voteEnabledRaw,
    omikujiEnabledRaw,
    tasukeruyoEnabledRaw,
    hideOpRaw,
    imgTagRaw,
    twitterEmbedRaw,
    movieEmbedRaw,
    urlToTitleRaw,
    autoFallRaw,
    captchaPerBoardRaw,
    usecaptchaOnAdminRaw,
    highLightRaw,
    weekdayCharsRaw,
    tripColumnRaw,
  }: {
    boardNameRaw: string;
    localRuleRaw: string;
    defaultAuthorNameRaw: string;
    maxContentLengthRaw: number;
    maxLinesRaw?: number;
    maxLineWidthRaw?: number;
    maxAnchorsRaw?: number;
    captchaProviderRaw?: string;
    captchaSiteKeyRaw?: string;
    captchaSecretKeyRaw?: string;
    enableDnsblRaw?: boolean;
    dnsblHostnamesRaw?: string;
    enableVpnDetectionRaw?: boolean;
    referrerCushionRaw?: string;
    headHtmlRaw?: string;
    footHtmlRaw?: string;
    metaHtmlRaw?: string;
    subtitleRaw?: string;
    faviconUrlRaw?: string;
    boardImageUrlRaw?: string;
    boardImageLinkUrlRaw?: string;
    bgColorRaw?: string;
    textColorRaw?: string;
    linkColorRaw?: string;
    nameColorRaw?: string;
    enableTwitterWidgetsRaw?: boolean;
    limitmeEnabledRaw?: boolean;
    limitmeFromRaw?: number;
    limitmeToRaw?: number;
    searchCaptchaEnabledRaw?: boolean;
    readTypeRaw?: string;
    autoDiscoverThreadsRaw?: boolean;
    bgColor2Raw?: string;
    titleColorRaw?: string;
    capColorRaw?: string;
    postBgColorRaw?: string;
    anchorColorRaw?: string;
    indexBgColorRaw?: string;
    createBgColorRaw?: string;
    menuBgColorRaw?: string;
    menuTextColorRaw?: string;
    titleIdRaw?: boolean;
    msecDisplayRaw?: boolean;
    hideHitsRaw?: boolean;
    prTextRaw?: string;
    prLinkRaw?: string;
    maxNameLengthRaw?: number;
    maxMailLengthRaw?: number;
    maxSubjectLengthRaw?: number;
    lineMaxCharsRaw?: number;
    submaxRaw?: number;
    datmaxRaw?: number;
    nanashiCheckRaw?: boolean;
    sambaTimeRaw?: number;
    houshiTimeRaw?: number;
    tatesugiHourRaw?: number;
    tatesugiCountRaw?: number;
    tatesugiCloseRaw?: number;
    tatesugiCloseCountRaw?: number;
    slipEnabledRaw?: boolean;
    slipDefaultLevelRaw?: string;
    dispIpRaw?: boolean;
    beEnabledRaw?: boolean;
    voteEnabledRaw?: boolean;
    omikujiEnabledRaw?: boolean;
    tasukeruyoEnabledRaw?: boolean;
    hideOpRaw?: boolean;
    imgTagRaw?: boolean;
    twitterEmbedRaw?: boolean;
    movieEmbedRaw?: boolean;
    urlToTitleRaw?: boolean;
    autoFallRaw?: boolean;
    captchaPerBoardRaw?: string;
    usecaptchaOnAdminRaw?: boolean;
    highLightRaw?: boolean;
    weekdayCharsRaw?: string;
    tripColumnRaw?: number;
  }
): Promise<Result<undefined, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateConfig",
    boardName: boardNameRaw,
    defaultAuthorName: defaultAuthorNameRaw,
    maxContentLength: maxContentLengthRaw,
    message: "Starting configuration update",
  });

  logger.debug({
    operation: "updateConfig",
    message: "Validating configuration values",
  });

  const combinedResult = Result.combine([
    createWriteBoardName(boardNameRaw),
    createWriteLocalRule(localRuleRaw),
    createWriteDefaultAuthorName(defaultAuthorNameRaw),
    createWriteMaxContentLength(maxContentLengthRaw),
  ]);

  if (combinedResult.isErr()) {
    logger.error({
      operation: "updateConfig",
      error: combinedResult.error,
      message: "Configuration validation failed",
    });
    return err(combinedResult.error);
  }

  const [boardName, localRule, defaultAuthorName, maxContentLength] =
    combinedResult.value;

  logger.debug({
    operation: "updateConfig",
    message: "Creating configuration object",
  });

  // 今回は値オブジェクトはないので、そのまま
  const config = await createWriteNormalConfig({
    boardName,
    localRule,
    defaultAuthorName,
    maxContentLength,
    maxLines: maxLinesRaw ?? 30,
    maxLineWidth: maxLineWidthRaw ?? 80,
    maxAnchors: maxAnchorsRaw ?? 10,
    captchaProvider: captchaProviderRaw ?? "none",
    captchaSiteKey: captchaSiteKeyRaw ?? "",
    captchaSecretKey: captchaSecretKeyRaw ?? "",
    enableDnsbl: enableDnsblRaw ?? false,
    dnsblHostnames: dnsblHostnamesRaw ?? "",
    enableVpnDetection: enableVpnDetectionRaw ?? false,
    referrerCushion: referrerCushionRaw ?? "",
    headHtml: headHtmlRaw ?? "",
    footHtml: footHtmlRaw ?? "",
    metaHtml: metaHtmlRaw ?? "",
    subtitle: subtitleRaw ?? "",
    faviconUrl: faviconUrlRaw ?? "",
    boardImageUrl: boardImageUrlRaw ?? "",
    boardImageLinkUrl: boardImageLinkUrlRaw ?? "",
    bgColor: bgColorRaw ?? "#f3f4f6",
    textColor: textColorRaw ?? "#1f2937",
    linkColor: linkColorRaw ?? "#7c3aed",
    nameColor: nameColorRaw ?? "#374151",
    enableTwitterWidgets: enableTwitterWidgetsRaw ?? false,
    limitmeEnabled: limitmeEnabledRaw ?? false,
    limitmeFrom: limitmeFromRaw ?? 0,
    limitmeTo: limitmeToRaw ?? 0,
    searchCaptchaEnabled: searchCaptchaEnabledRaw ?? false,
    readType: readTypeRaw ?? "5ch",
    autoDiscoverThreads: autoDiscoverThreadsRaw ?? true,
    bgColor2: bgColor2Raw ?? "#ffffff",
    titleColor: titleColorRaw ?? "#000000",
    capColor: capColorRaw ?? "#ff0000",
    postBgColor: postBgColorRaw ?? "#ffffff",
    anchorColor: anchorColorRaw ?? "#0000ff",
    indexBgColor: indexBgColorRaw ?? "#ffffff",
    createBgColor: createBgColorRaw ?? "#ffffff",
    menuBgColor: menuBgColorRaw ?? "#ffffff",
    menuTextColor: menuTextColorRaw ?? "#000000",
    titleId: titleIdRaw ?? true,
    msecDisplay: msecDisplayRaw ?? false,
    hideHits: hideHitsRaw ?? false,
    prText: prTextRaw ?? "",
    prLink: prLinkRaw ?? "",
    maxNameLength: maxNameLengthRaw ?? 20,
    maxMailLength: maxMailLengthRaw ?? 50,
    maxSubjectLength: maxSubjectLengthRaw ?? 100,
    lineMaxChars: lineMaxCharsRaw ?? 80,
    submax: submaxRaw ?? 1000,
    datmax: datmaxRaw ?? 1000,
    nanashiCheck: nanashiCheckRaw ?? true,
    sambaTime: sambaTimeRaw ?? 30,
    houshiTime: houshiTimeRaw ?? 60,
    tatesugiHour: tatesugiHourRaw ?? 24,
    tatesugiCount: tatesugiCountRaw ?? 5,
    tatesugiClose: tatesugiCloseRaw ?? 48,
    tatesugiCloseCount: tatesugiCloseCountRaw ?? 3,
    slipEnabled: slipEnabledRaw ?? false,
    slipDefaultLevel: slipDefaultLevelRaw ?? "vvv",
    dispIp: dispIpRaw ?? false,
    beEnabled: beEnabledRaw ?? false,
    voteEnabled: voteEnabledRaw ?? false,
    omikujiEnabled: omikujiEnabledRaw ?? false,
    tasukeruyoEnabled: tasukeruyoEnabledRaw ?? false,
    hideOp: hideOpRaw ?? false,
    imgTag: imgTagRaw ?? false,
    twitterEmbed: twitterEmbedRaw ?? false,
    movieEmbed: movieEmbedRaw ?? false,
    urlToTitle: urlToTitleRaw ?? false,
    autoFall: autoFallRaw ?? false,
    captchaPerBoard: captchaPerBoardRaw ?? "none",
    usecaptchaOnAdmin: usecaptchaOnAdminRaw ?? false,
    highLight: highLightRaw ?? true,
    weekdayChars: weekdayCharsRaw ?? "日月火水木金土",
    tripColumn: tripColumnRaw ?? 0,
  });

  if (config.isErr()) {
    logger.error({
      operation: "updateConfig",
      error: config.error,
      message: "Failed to create configuration object",
    });
    return err(config.error);
  }

  logger.debug({
    operation: "updateConfig",
    message: "Updating configuration in database",
  });

  const result = await updateNormalConfigRepository(vakContext, config.value);
  if (result.isErr()) {
    logger.error({
      operation: "updateConfig",
      error: result.error,
      message: "Failed to update configuration in database",
    });
    return err(result.error);
  }

  logger.info({
    operation: "updateConfig",
    boardName: boardNameRaw,
    defaultAuthorName: defaultAuthorNameRaw,
    message: "Configuration updated successfully",
  });

  return ok(undefined);
};
