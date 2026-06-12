export type CommandResponse = {
  type: "error" | "success" | "display";
  message: string;
};

import { evaluateExpression, convertBase, getVersion, getBody, getPower, getWho, getWhere, getHungry, getFood, getRandomYear, getRandomMon, getRandomDay, getYakyu, getPoke, getExpo, getEtc } from "../../vip/services/vipGameService";
import { generateIQ, generateKote, drawCard, getAnimeCharacter, getMibun, getSute } from "../../profile/services/profileGeneratorService";

export type ParsedCommand = {
  action:
    | "none"
    | "changetitle"
    | "delete"
    | "add"
    | "vote"
    | "attr"
    | "omikuji"
    | "extend"
    | "delcmd"
    | "loadattr"
    | "noid"
    | "changeid"
    | "ninlv"
    | "change774"
    | "sub"
    | "cap"
    | "password"
    | "maxres"
    | "forcesage"
    | "force774"
    | "stop"
    | "pool"
    | "live"
    | "slip"
    | "ban"
    | "hidenushi"
    | "float"
    | "nopool"
    | "send"
    | "throw"
    | "calc"
    | "base"
    | "ver"
    | "who"
    | "where"
    | "body"
    | "power"
    | "year"
    | "mon"
    | "day"
    | "hungry"
    | "food"
    | "yakyu"
    | "poke"
    | "expo"
    | "etc"
    | "iq"
    | "kote"
    | "card"
    | "anime"
    | "mibun"
    | "sute";
  params: Record<string, string>;
  response?: CommandResponse;
};

export type CommandResult = {
  commands: ParsedCommand[];
  processedContent: string;
};

export type CommandContext = {
  threadId: string;
  isThreadCreator: boolean;
  hasCapPermission: boolean;
  ninpochoLevel: number;
  existingAttrs: Record<string, unknown>;
  threadResponses: Array<{ number: number; authorHashId: string }>;
  currentHashId: string;
};

export const getDailyOmikuji = (seed: string): { rank: string; message: string; probability: number } => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const rng = Math.abs(hash) % 270000;

  if (rng === 0) return { rank: "【勘察加】", message: "人生は冒険だ！", probability: 1 / 270000 };
  if (rng < 100) return { rank: "【大吉】", message: "素晴らしい一日！", probability: 100 / 270000 };
  if (rng < 1000) return { rank: "【吉】", message: "良いことがあるかも", probability: 900 / 270000 };
  if (rng < 5000) return { rank: "【中吉】", message: "まずまずの運勢", probability: 4000 / 270000 };
  if (rng < 15000) return { rank: "【小吉】", message: "小さな幸せ", probability: 10000 / 270000 };
  if (rng < 30000) return { rank: "【末吉】", message: "後半に期待", probability: 15000 / 270000 };
  if (rng < 50000) return { rank: "【凶】", message: "慎重に行動を", probability: 20000 / 270000 };
  if (rng < 70000) return { rank: "【大凶】", message: "おとなしくしていよう", probability: 20000 / 270000 };
  return { rank: "【末吉】", message: "まあまあの一日", probability: 200000 / 270000 };
};

const OMIKUJI_OPTIONS: Array<{ text: string; weight: number }> = [
  { text: "大吉", weight: 5 },
  { text: "中吉", weight: 10 },
  { text: "小吉", weight: 15 },
  { text: "吉", weight: 20 },
  { text: "半吉", weight: 10 },
  { text: "末吉", weight: 10 },
  { text: "末小吉", weight: 8 },
  { text: "凶", weight: 8 },
  { text: "小凶", weight: 5 },
  { text: "大凶", weight: 2 },
];

const drawOmikuji = (): string => {
  const totalWeight = OMIKUJI_OPTIONS.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;
  for (const option of OMIKUJI_OPTIONS) {
    random -= option.weight;
    if (random <= 0) {
      return option.text;
    }
  }
  return OMIKUJI_OPTIONS[0].text;
};

const extractCommands = (
  content: string
): { commandLines: string[]; processedContent: string } => {
  const lines = content.split("\n");
  const commandLines: string[] = [];
  let contentStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith("!")) {
      commandLines.push(lines[i].trim());
      contentStartIndex = i + 1;
    } else {
      break;
    }
  }

  const processedContent = lines.slice(contentStartIndex).join("\n");
  return { commandLines, processedContent };
};

const parseSingleCommand = (
  cmdLine: string,
  context: CommandContext
): ParsedCommand => {
  const trimmed = cmdLine.trim();

  if (trimmed.startsWith("!changetitle:") || trimmed.startsWith("!chtt:")) {
    const prefix = trimmed.startsWith("!changetitle:") ? "!changetitle:" : "!chtt:";
    const newTitle = trimmed.substring(prefix.length);
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "changetitle",
        params: { title: newTitle },
        response: { type: "error", message: "スレッド作成者またはcapが必要です" },
      };
    }
    return { action: "changetitle", params: { title: newTitle } };
  }

  if (trimmed.startsWith("!delete:")) {
    const target = trimmed.substring("!delete:".length);
    if (!context.hasCapPermission && context.ninpochoLevel <= 0) {
      return {
        action: "delete",
        params: { target },
        response: { type: "error", message: "忍法帖レベルまたはcapが必要です" },
      };
    }
    return { action: "delete", params: { target } };
  }

  if (trimmed.startsWith("!add:")) {
    const rest = trimmed.substring("!add:".length);
    const match = rest.match(/^>>(\d+):(.+)$/s);
    if (!match) {
      return {
        action: "add",
        params: {},
        response: { type: "error", message: "!add:>>レス番号:追加テキスト の形式で指定してください" },
      };
    }
    const resNum = parseInt(match[1], 10);
    const appendText = match[2];
    const targetResp = context.threadResponses.find((r) => r.number === resNum);
    if (!targetResp) {
      return {
        action: "add",
        params: { number: String(resNum), text: appendText },
        response: { type: "error", message: `レス番号>>${resNum}が見つかりません` },
      };
    }
    if (targetResp.authorHashId !== context.currentHashId) {
      return {
        action: "add",
        params: { number: String(resNum), text: appendText },
        response: { type: "error", message: "自分のレスにのみ追加できます" },
      };
    }
    return { action: "add", params: { number: String(resNum), text: appendText } };
  }

  if (trimmed.startsWith("!vote:")) {
    const target = trimmed.substring("!vote:".length);
    const match = target.match(/^>>(\d+)$/);
    if (!match) {
      return {
        action: "vote",
        params: {},
        response: { type: "error", message: "!vote:>>レス番号 の形式で指定してください" },
      };
    }
    const resNum = parseInt(match[1], 10);
    const targetResp = context.threadResponses.find((r) => r.number === resNum);
    if (!targetResp) {
      return {
        action: "vote",
        params: { target: String(resNum) },
        response: { type: "error", message: `レス番号>>${resNum}が見つかりません` },
      };
    }
    if (targetResp.authorHashId === context.currentHashId) {
      return {
        action: "vote",
        params: { target: String(resNum), selfVote: "true" },
        response: { type: "display", message: "自己投票は即時BANの対象です" },
      };
    }
    return { action: "vote", params: { target: String(resNum), targetHashId: targetResp.authorHashId } };
  }

  if (trimmed === "!attr") {
    const attrs = context.existingAttrs;
    const lines: string[] = [];
    if (attrs.sticky) lines.push("sticky: true");
    if (attrs.sageOnly) lines.push("sageOnly: true");
    if (attrs.password) lines.push(`password: ${attrs.password}`);
    if (attrs.threadPassword) lines.push(`threadPassword: ${attrs.threadPassword}`);
    if (attrs.customMaxRes !== undefined) lines.push(`customMaxRes: ${attrs.customMaxRes}`);
    if (attrs.noId) lines.push("noId: true");
    if (attrs.force774) lines.push("force774: true");
    if (attrs.custom774) lines.push(`custom774: ${attrs.custom774}`);
    if (attrs.stopped) lines.push("stopped: true");
    if (attrs.pooled) lines.push("pooled: true");
    if (attrs.live) lines.push("live: true");
    if (attrs.slipLevel) lines.push(`slipLevel: ${attrs.slipLevel}`);
    if (attrs.hideNushi) lines.push("hideNushi: true");
    if (attrs.noPool) lines.push("noPool: true");
    if (attrs.bans && typeof attrs.bans === "object" && Object.keys(attrs.bans).length > 0) {
      lines.push(`bans: ${Object.keys(attrs.bans).length} users`);
    }
    if (attrs.ninpochoLevel !== undefined) lines.push(`ninpochoLevel: ${attrs.ninpochoLevel}`);
    const displayText = lines.length > 0 ? lines.join("\n") : "属性は設定されていません";
    return {
      action: "attr",
      params: {},
      response: { type: "display", message: displayText },
    };
  }

  if (trimmed === "!omikuji") {
    const fortune = drawOmikuji();
    return {
      action: "omikuji",
      params: { fortune },
      response: { type: "display", message: fortune },
    };
  }

  if (trimmed.startsWith("!extend:")) {
    const rest = trimmed.substring("!extend:".length);
    const parts = rest.split(":");
    if (parts.length < 4) {
      return {
        action: "extend",
        params: {},
        response: { type: "error", message: "!extend:id:slip:lines:size の形式で指定してください" },
      };
    }
    if (!context.hasCapPermission) {
      return {
        action: "extend",
        params: {},
        response: { type: "error", message: "cap権限が必要です" },
      };
    }
    return {
      action: "extend",
      params: { id: parts[0], slip: parts[1], lines: parts[2], size: parts[3] },
    };
  }

  if (trimmed.startsWith("!delcmd:")) {
    const cmd = trimmed.substring("!delcmd:".length);
    return { action: "delcmd", params: { command: cmd } };
  }

  if (trimmed.startsWith("!loadattr:")) {
    const targetThreadId = trimmed.substring("!loadattr:".length);
    if (!context.hasCapPermission) {
      return {
        action: "loadattr",
        params: { threadId: targetThreadId },
        response: { type: "error", message: "cap権限が必要です" },
      };
    }
    return { action: "loadattr", params: { threadId: targetThreadId } };
  }

  if (trimmed === "!noid") {
    return { action: "noid", params: {} };
  }

  if (trimmed === "!changeid") {
    return { action: "changeid", params: {} };
  }

  if (trimmed.startsWith("!ninlv:")) {
    const levelStr = trimmed.substring("!ninlv:".length);
    const level = parseInt(levelStr, 10);
    if (isNaN(level) || level < 0) {
      return {
        action: "ninlv",
        params: {},
        response: { type: "error", message: "!ninlv:数値 の形式で指定してください" },
      };
    }
    return { action: "ninlv", params: { level: String(level) } };
  }

  if (trimmed.startsWith("!change774:")) {
    const name = trimmed.substring("!change774:".length);
    if (!name) {
      return {
        action: "change774",
        params: {},
        response: { type: "error", message: "!change774:名前 の形式で指定してください" },
      };
    }
    return { action: "change774", params: { name } };
  }

  if (trimmed.startsWith("!sub:")) {
    const target = trimmed.substring("!sub:".length);
    const match = target.match(/^>>(\d+)$/);
    if (!match) {
      return {
        action: "sub",
        params: {},
        response: { type: "error", message: "!sub:>>レス番号 の形式で指定してください" },
      };
    }
    const resNum = parseInt(match[1], 10);
    const targetResp = context.threadResponses.find((r) => r.number === resNum);
    if (!targetResp) {
      return {
        action: "sub",
        params: { number: String(resNum) },
        response: { type: "error", message: `レス番号>>${resNum}が見つかりません` },
      };
    }
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "sub",
        params: { number: String(resNum), targetHashId: targetResp.authorHashId },
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "sub", params: { number: String(resNum), targetHashId: targetResp.authorHashId } };
  }

  if (trimmed.startsWith("!cap:")) {
    const rest = trimmed.substring("!cap:".length);
    const match = rest.match(/^>>(\d+):(.+)$/);
    if (!match) {
      return {
        action: "cap",
        params: {},
        response: { type: "error", message: "!cap:>>レス番号:表示名 の形式で指定してください" },
      };
    }
    const resNum = parseInt(match[1], 10);
    const displayName = match[2];
    const targetResp = context.threadResponses.find((r) => r.number === resNum);
    if (!targetResp) {
      return {
        action: "cap",
        params: { number: String(resNum), displayName },
        response: { type: "error", message: `レス番号>>${resNum}が見つかりません` },
      };
    }
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "cap",
        params: { number: String(resNum), displayName, targetHashId: targetResp.authorHashId },
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "cap", params: { number: String(resNum), displayName, targetHashId: targetResp.authorHashId } };
  }

  if (trimmed.startsWith("!pass:")) {
    const password = trimmed.substring("!pass:".length);
    if (!password) {
      return {
        action: "password",
        params: {},
        response: { type: "error", message: "!pass:パスワード の形式で指定してください" },
      };
    }
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "password",
        params: { password },
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "password", params: { password } };
  }

  if (trimmed.startsWith("!maxres:")) {
    const numStr = trimmed.substring("!maxres:".length);
    const num = parseInt(numStr, 10);
    if (isNaN(num) || num < 1) {
      return {
        action: "maxres",
        params: {},
        response: { type: "error", message: "!maxres:数値 の形式で指定してください" },
      };
    }
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "maxres",
        params: { maxRes: String(num) },
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "maxres", params: { maxRes: String(num) } };
  }

  if (trimmed === "!sage") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "forcesage",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "forcesage", params: {} };
  }

  if (trimmed === "!force774") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "force774",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "force774", params: {} };
  }

  if (trimmed === "!stop") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "stop",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "stop", params: {} };
  }

  if (trimmed === "!pool") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "pool",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "pool", params: {} };
  }

  if (trimmed === "!live") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "live",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "live", params: {} };
  }

  if (trimmed.startsWith("!slip:")) {
    const level = trimmed.substring("!slip:".length);
    if (!level || !/^v{3,6}$/.test(level)) {
      return {
        action: "slip",
        params: {},
        response: { type: "error", message: "!slip:vvv/vvvv/vvvvv/vvvvvv の形式で指定してください" },
      };
    }
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "slip",
        params: { level },
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "slip", params: { level } };
  }

  if (trimmed.startsWith("!ban:")) {
    const target = trimmed.substring("!ban:".length);
    const match = target.match(/^>>(\d+)$/);
    if (!match) {
      return {
        action: "ban",
        params: {},
        response: { type: "error", message: "!ban:>>レス番号 の形式で指定してください" },
      };
    }
    const resNum = parseInt(match[1], 10);
    const targetResp = context.threadResponses.find((r) => r.number === resNum);
    if (!targetResp) {
      return {
        action: "ban",
        params: { number: String(resNum) },
        response: { type: "error", message: `レス番号>>${resNum}が見つかりません` },
      };
    }
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "ban",
        params: { number: String(resNum), targetHashId: targetResp.authorHashId },
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "ban", params: { number: String(resNum), targetHashId: targetResp.authorHashId } };
  }

  if (trimmed === "!hidenusi") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "hidenushi",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "hidenushi", params: {} };
  }

  if (trimmed === "!float") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "float",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "float", params: {} };
  }

  if (trimmed === "!nopool") {
    if (!context.isThreadCreator && !context.hasCapPermission) {
      return {
        action: "nopool",
        params: {},
        response: { type: "error", message: "スレッド作成者またはcap権限が必要です" },
      };
    }
    return { action: "nopool", params: {} };
  }

  if (trimmed.startsWith("!send:")) {
    const rest = trimmed.substring("!send:".length);
    const parts = rest.split(":");
    if (parts.length < 2) {
      return { action: "send", params: {}, response: { type: "error", message: "!send:hash_id:amount の形式で指定してください" } };
    }
    const toHashId = parts[0];
    const amount = parseInt(parts[1], 10);
    if (isNaN(amount) || amount <= 0) {
      return { action: "send", params: {}, response: { type: "error", message: "送金金額は正の整数で指定してください" } };
    }
    return { action: "send", params: { toHashId: toHashId, amount: String(amount) } };
  }

  if (trimmed.startsWith("!throw:")) {
    const rest = trimmed.substring("!throw:".length);
    const match = rest.match(/^>>(\d+):(.+)$/);
    if (!match) {
      return { action: "throw", params: {}, response: { type: "error", message: "!throw:>>レス番号:金額 の形式で指定してください" } };
    }
    const resNum = parseInt(match[1], 10);
    const amount = parseInt(match[2], 10);
    if (isNaN(amount) || amount <= 0) {
      return { action: "throw", params: {}, response: { type: "error", message: "投げ銭金額は正の整数で指定してください" } };
    }
    const targetResp = context.threadResponses.find((r) => r.number === resNum);
    if (!targetResp) {
      return { action: "throw", params: { targetResponse: String(resNum), amount: String(amount) }, response: { type: "error", message: `レス番号>>${resNum}が見つかりません` } };
    }
    return { action: "throw", params: { targetResponse: String(resNum), targetHashId: targetResp.authorHashId, amount: String(amount) } };
  }

  if (trimmed.startsWith("!calc:")) {
    const expr = trimmed.substring("!calc:".length);
    const result = evaluateExpression(expr);
    return { action: "calc", params: {}, response: { type: "display", message: `${expr} = ${result}` } };
  }

  if (trimmed.startsWith("!base:")) {
    const rest = trimmed.substring("!base:".length);
    const parts = rest.split(":");
    if (parts.length < 2) {
      return { action: "base", params: {}, response: { type: "error", message: "!base:数値:基数 の形式で指定してください" } };
    }
    const result = convertBase(parts[0], parts[1]);
    return { action: "base", params: {}, response: { type: "display", message: `${parts[0]} (base10) = ${result} (base${parts[1]})` } };
  }

  if (trimmed === "!ver" || trimmed === "!version") {
    return { action: "ver", params: {}, response: { type: "display", message: getVersion() } };
  }

  if (trimmed === "!who") {
    const who = getWho(context.currentHashId);
    return { action: "who", params: {}, response: { type: "display", message: `あなたは${who}です` } };
  }

  if (trimmed === "!where") {
    const where = getWhere(context.currentHashId);
    return { action: "where", params: {}, response: { type: "display", message: `あなたは${where}にいます` } };
  }

  if (trimmed === "!body") {
    return { action: "body", params: {}, response: { type: "display", message: getBody(context.currentHashId) } };
  }

  if (trimmed === "!power") {
    return { action: "power", params: {}, response: { type: "display", message: `戦闘力 ${getPower(context.currentHashId)}` } };
  }

  if (trimmed === "!year") {
    return { action: "year", params: {}, response: { type: "display", message: `${getRandomYear(context.currentHashId)}年` } };
  }

  if (trimmed === "!mon") {
    return { action: "mon", params: {}, response: { type: "display", message: getRandomMon(context.currentHashId) } };
  }

  if (trimmed === "!day") {
    return { action: "day", params: {}, response: { type: "display", message: getRandomDay(context.currentHashId) } };
  }

  if (trimmed === "!hungry") {
    return { action: "hungry", params: {}, response: { type: "display", message: `${getHungry(context.currentHashId)}が食べたい` } };
  }

  if (trimmed === "!food") {
    return { action: "food", params: {}, response: { type: "display", message: `今日の食事は${getFood(context.currentHashId)}` } };
  }

  if (trimmed === "!yakyu") {
    return { action: "yakyu", params: {}, response: { type: "display", message: getYakyu(context.currentHashId) } };
  }

  if (trimmed === "!poke") {
    return { action: "poke", params: {}, response: { type: "display", message: `${getPoke(context.currentHashId)}が飛び出した！` } };
  }

  if (trimmed === "!expo") {
    return { action: "expo", params: {}, response: { type: "display", message: `開催中: ${getExpo(context.currentHashId)}` } };
  }

  if (trimmed === "!etc") {
    return { action: "etc", params: {}, response: { type: "display", message: getEtc(context.currentHashId) } };
  }

  if (trimmed === "!IQ" || trimmed === "!iq") {
    const iq = generateIQ(context.currentHashId);
    return { action: "iq", params: {}, response: { type: "display", message: `あなたのIQは${iq}です` } };
  }

  if (trimmed === "!kote") {
    return { action: "kote", params: {}, response: { type: "display", message: `あなたのコテハンは${generateKote(context.currentHashId)}です` } };
  }

  if (trimmed === "!card") {
    return { action: "card", params: {}, response: { type: "display", message: `引いたカード: ${drawCard(context.currentHashId)}` } };
  }

  if (trimmed === "!anime") {
    return { action: "anime", params: {}, response: { type: "display", message: `あなたの分身: ${getAnimeCharacter(context.currentHashId)}` } };
  }

  if (trimmed === "!mibun") {
    return { action: "mibun", params: {}, response: { type: "display", message: `あなたの身分は${getMibun(context.currentHashId)}です` } };
  }

  if (trimmed === "!sute") {
    return { action: "sute", params: {}, response: { type: "display", message: getSute(context.currentHashId) } };
  }

  return {
    action: "none",
    params: {},
    response: { type: "error", message: `不明なコマンドです: ${trimmed}` },
  };
};

export const parseCommands = (
  content: string,
  context: CommandContext
): CommandResult => {
  const { commandLines, processedContent } = extractCommands(content);

  if (commandLines.length === 0) {
    return { commands: [], processedContent };
  }

  const commands: ParsedCommand[] = [];
  for (const cmdLine of commandLines) {
    const cmd = parseSingleCommand(cmdLine, context);
    commands.push(cmd);
  }

  return { commands, processedContent };
};
