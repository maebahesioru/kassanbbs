import { ok } from "neverthrow";

import type { ReadBoardName } from "./ReadBoardName";
import type { ReadDefaultAuthorName } from "./ReadDefaultAuthorName";
import type { ReadLocalRule } from "./ReadLocalRule";
import type { ReadMaxContentLength } from "./ReadMaxContentLength";
import type { Result } from "neverthrow";

export type ReadNormalConfig = {
  readonly _type: "ReadNormalConfig";
  readonly boardName: ReadBoardName;
  readonly localRule: ReadLocalRule;
  readonly defaultAuthorName: ReadDefaultAuthorName;
  readonly maxContentLength: ReadMaxContentLength;
  readonly maxLines: number;
  readonly maxLineWidth: number;
  readonly maxAnchors: number;
  readonly captchaProvider: string;
  readonly captchaSiteKey: string;
  readonly captchaSecretKey: string;
  readonly enableDnsbl: boolean;
  readonly dnsblHostnames: string;
  readonly enableVpnDetection: boolean;
  readonly headHtml: string;
  readonly footHtml: string;
  readonly metaHtml: string;
  readonly referrerCushion: string;
  readonly subtitle: string;
  readonly faviconUrl: string;
  readonly boardImageUrl: string;
  readonly boardImageLinkUrl: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly linkColor: string;
  readonly nameColor: string;
  readonly enableTwitterWidgets: boolean;
  readonly limitmeEnabled: boolean;
  readonly limitmeFrom: number;
  readonly limitmeTo: number;
  readonly searchCaptchaEnabled: boolean;
  readonly readType: string;
  readonly autoDiscoverThreads: boolean;
  // Color settings
  readonly bgColor2: string;
  readonly titleColor: string;
  readonly capColor: string;
  readonly postBgColor: string;
  readonly anchorColor: string;
  readonly indexBgColor: string;
  readonly createBgColor: string;
  readonly menuBgColor: string;
  readonly menuTextColor: string;
  // Display settings
  readonly titleId: boolean;
  readonly msecDisplay: boolean;
  readonly hideHits: boolean;
  readonly prText: string;
  readonly prLink: string;
  // Limits
  readonly maxNameLength: number;
  readonly maxMailLength: number;
  readonly maxSubjectLength: number;
  readonly lineMaxChars: number;
  readonly submax: number;
  readonly datmax: number;
  readonly nanashiCheck: boolean;
  readonly sambaTime: number;
  readonly houshiTime: number;
  readonly tatesugiHour: number;
  readonly tatesugiCount: number;
  readonly tatesugiClose: number;
  readonly tatesugiCloseCount: number;
  // Features
  readonly slipEnabled: boolean;
  readonly slipDefaultLevel: string;
  readonly dispIp: boolean;
  readonly beEnabled: boolean;
  readonly voteEnabled: boolean;
  readonly omikujiEnabled: boolean;
  readonly tasukeruyoEnabled: boolean;
  readonly hideOp: boolean;
  readonly imgTag: boolean;
  readonly twitterEmbed: boolean;
  readonly movieEmbed: boolean;
  readonly urlToTitle: boolean;
  readonly autoFall: boolean;
  readonly captchaPerBoard: string;
  readonly usecaptchaOnAdmin: boolean;
  // Character settings
  readonly highLight: boolean;
  readonly weekdayChars: string;
  readonly tripColumn: number;
};

export const createReadNormalConfig = ({
  boardName,
  localRule,
  defaultAuthorName,
  maxContentLength,
  maxLines,
  maxLineWidth,
  maxAnchors,
  captchaProvider,
  captchaSiteKey,
  captchaSecretKey,
  enableDnsbl,
  dnsblHostnames,
  enableVpnDetection,
  referrerCushion,
  headHtml,
  footHtml,
  metaHtml,
  subtitle,
  faviconUrl,
  boardImageUrl,
  boardImageLinkUrl,
  bgColor,
  textColor,
  linkColor,
  nameColor,
  enableTwitterWidgets,
  limitmeEnabled,
  limitmeFrom,
  limitmeTo,
  searchCaptchaEnabled,
  readType,
  autoDiscoverThreads,
  bgColor2,
  titleColor,
  capColor,
  postBgColor,
  anchorColor,
  indexBgColor,
  createBgColor,
  menuBgColor,
  menuTextColor,
  titleId,
  msecDisplay,
  hideHits,
  prText,
  prLink,
  maxNameLength,
  maxMailLength,
  maxSubjectLength,
  lineMaxChars,
  submax,
  datmax,
  nanashiCheck,
  sambaTime,
  houshiTime,
  tatesugiHour,
  tatesugiCount,
  tatesugiClose,
  tatesugiCloseCount,
  slipEnabled,
  slipDefaultLevel,
  dispIp,
  beEnabled,
  voteEnabled,
  omikujiEnabled,
  tasukeruyoEnabled,
  hideOp,
  imgTag,
  twitterEmbed,
  movieEmbed,
  urlToTitle,
  autoFall,
  captchaPerBoard,
  usecaptchaOnAdmin,
  highLight,
  weekdayChars,
  tripColumn,
}: {
  boardName: ReadBoardName;
  localRule: ReadLocalRule;
  defaultAuthorName: ReadDefaultAuthorName;
  maxContentLength: ReadMaxContentLength;
  maxLines: number;
  maxLineWidth: number;
  maxAnchors: number;
  captchaProvider: string;
  captchaSiteKey: string;
  captchaSecretKey: string;
  enableDnsbl: boolean;
  dnsblHostnames: string;
  enableVpnDetection: boolean;
  referrerCushion: string;
  headHtml: string;
  footHtml: string;
  metaHtml: string;
  subtitle: string;
  faviconUrl: string;
  boardImageUrl: string;
  boardImageLinkUrl: string;
  bgColor: string;
  textColor: string;
  linkColor: string;
  nameColor: string;
  enableTwitterWidgets: boolean;
  limitmeEnabled: boolean;
  limitmeFrom: number;
  limitmeTo: number;
  searchCaptchaEnabled: boolean;
  readType: string;
  autoDiscoverThreads: boolean;
  bgColor2: string;
  titleColor: string;
  capColor: string;
  postBgColor: string;
  anchorColor: string;
  indexBgColor: string;
  createBgColor: string;
  menuBgColor: string;
  menuTextColor: string;
  titleId: boolean;
  msecDisplay: boolean;
  hideHits: boolean;
  prText: string;
  prLink: string;
  maxNameLength: number;
  maxMailLength: number;
  maxSubjectLength: number;
  lineMaxChars: number;
  submax: number;
  datmax: number;
  nanashiCheck: boolean;
  sambaTime: number;
  houshiTime: number;
  tatesugiHour: number;
  tatesugiCount: number;
  tatesugiClose: number;
  tatesugiCloseCount: number;
  slipEnabled: boolean;
  slipDefaultLevel: string;
  dispIp: boolean;
  beEnabled: boolean;
  voteEnabled: boolean;
  omikujiEnabled: boolean;
  tasukeruyoEnabled: boolean;
  hideOp: boolean;
  imgTag: boolean;
  twitterEmbed: boolean;
  movieEmbed: boolean;
  urlToTitle: boolean;
  autoFall: boolean;
  captchaPerBoard: string;
  usecaptchaOnAdmin: boolean;
  highLight: boolean;
  weekdayChars: string;
  tripColumn: number;
}): Result<ReadNormalConfig, Error> => {
  return ok({
    _type: "ReadNormalConfig",
    boardName,
    localRule,
    defaultAuthorName,
    maxContentLength,
    maxLines,
    maxLineWidth,
    maxAnchors,
    captchaProvider,
    captchaSiteKey,
    captchaSecretKey,
    enableDnsbl,
    dnsblHostnames,
    enableVpnDetection,
    referrerCushion,
    headHtml,
    footHtml,
    metaHtml,
    subtitle,
    faviconUrl,
    boardImageUrl,
    boardImageLinkUrl,
    bgColor,
    textColor,
    linkColor,
    nameColor,
    enableTwitterWidgets,
    limitmeEnabled,
    limitmeFrom,
    limitmeTo,
    searchCaptchaEnabled,
    readType,
    autoDiscoverThreads,
    bgColor2,
    titleColor,
    capColor,
    postBgColor,
    anchorColor,
    indexBgColor,
    createBgColor,
    menuBgColor,
    menuTextColor,
    titleId,
    msecDisplay,
    hideHits,
    prText,
    prLink,
    maxNameLength,
    maxMailLength,
    maxSubjectLength,
    lineMaxChars,
    submax,
    datmax,
    nanashiCheck,
    sambaTime,
    houshiTime,
    tatesugiHour,
    tatesugiCount,
    tatesugiClose,
    tatesugiCloseCount,
    slipEnabled,
    slipDefaultLevel,
    dispIp,
    beEnabled,
    voteEnabled,
    omikujiEnabled,
    tasukeruyoEnabled,
    hideOp,
    imgTag,
    twitterEmbed,
    movieEmbed,
    urlToTitle,
    autoFall,
    captchaPerBoard,
    usecaptchaOnAdmin,
    highLight,
    weekdayChars,
    tripColumn,
  });
};
