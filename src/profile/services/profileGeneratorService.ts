import { seededRandom } from "../../vip/services/vipGameService";

const IQ_RANGES = [
  { min: 50, max: 70, prob: 0.05 },
  { min: 70, max: 85, prob: 0.15 },
  { min: 85, max: 115, prob: 0.60 },
  { min: 115, max: 130, prob: 0.15 },
  { min: 130, max: 145, prob: 0.04 },
  { min: 145, max: 200, prob: 0.01 },
];

export const generateIQ = (seed: string): number => {
  const r = seededRandom(seed + "iq");
  let cumProb = 0;
  for (const range of IQ_RANGES) {
    cumProb += range.prob;
    if (r < cumProb) {
      return Math.floor(range.min + seededRandom(seed + "iq_inner") * (range.max - range.min));
    }
  }
  return 100;
};

const hashString = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const KOTE_PREFIXES = ["◆", "☆", "★", "○", "◎", "◇"];
const KOTE_NAMES = ["名無し", "匿名", "通りすがり", "VIPPER", "神", "勇者", "魔法使い", "戦士", "僧侶", "盗賊"];

export const generateKote = (seed: string): string => {
  const prefix = KOTE_PREFIXES[Math.floor(seededRandom(seed + "kote_prefix") * KOTE_PREFIXES.length)];
  const name = KOTE_NAMES[Math.floor(seededRandom(seed + "kote_name") * KOTE_NAMES.length)];
  const suffix = Math.abs(hashString(seed)).toString(16).substring(0, 4).toUpperCase();
  return `${prefix}${name}${suffix}`;
};

const CARD_DECK = ["♠A", "♠2", "♠3", "♠4", "♠5", "♠6", "♠7", "♠8", "♠9", "♠10", "♠J", "♠Q", "♠K",
  "♥A", "♥2", "♥3", "♥4", "♥5", "♥6", "♥7", "♥8", "♥9", "♥10", "♥J", "♥Q", "♥K",
  "♦A", "♦2", "♦3", "♦4", "♦5", "♦6", "♦7", "♦8", "♦9", "♦10", "♦J", "♦Q", "♦K",
  "♣A", "♣2", "♣3", "♣4", "♣5", "♣6", "♣7", "♣8", "♣9", "♣10", "♣J", "♣Q", "♣K",
  "Joker"];

export const drawCard = (seed: string): string => {
  return CARD_DECK[Math.floor(seededRandom(seed + "card") * CARD_DECK.length)];
};

const ANIME_CHARACTERS = ["孫悟空", "モンキー・D・ルフィ", "エレン・イェーガー", "碇シンジ", "キリト", "ナルト", "サイタマ", "デンジ", "アムロ・レイ", "ガンダム"];

export const getAnimeCharacter = (seed: string): string => {
  return ANIME_CHARACTERS[Math.floor(seededRandom(seed + "anime") * ANIME_CHARACTERS.length)];
};

const MIBUN_OPTIONS = ["平民", "貴族", "王族", "神", "勇者", "魔王", "賢者", "戦士", "魔法使い", "盗賊", "忍者", "武士", "僧侶", "商人", "農民"];

export const getMibun = (seed: string): string => {
  return MIBUN_OPTIONS[Math.floor(seededRandom(seed + "mibun") * MIBUN_OPTIONS.length)];
};

const SUTE_OPTIONS = ["捨てる", "捨てない", "保留", "迷う", "とりあえず保持", "リサイクル", "寄付する", "売る", "燃やす", "埋める"];

export const getSute = (seed: string): string => {
  return SUTE_OPTIONS[Math.floor(seededRandom(seed + "sute") * SUTE_OPTIONS.length)];
};
