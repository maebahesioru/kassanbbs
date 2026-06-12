export const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) / 2147483647;
};

export const getSeededOption = (seed: string, options: string[]): string => {
  return options[Math.floor(seededRandom(seed) * options.length)];
};

const BODY_OPTIONS = ["頭", "腕", "足", "目", "鼻", "口", "耳", "心", "肝", "魂"];
const POWER_OPTIONS = ["1", "10", "50", "100", "500", "1000", "5000", "10000", "∞", "0"];
const HUNGRY_OPTIONS = ["ラーメン", "寿司", "カレー", "ハンバーガー", "ピザ", "うどん", "そば", "焼肉", "刺身", "天ぷら"];
const WHO_OPTIONS = ["名無し", "通りすがり", "匿名希望", "一般人", "住人", "VIPPER", "神", "初心者", "ベテラン", "管理人"];
const WHERE_OPTIONS = ["2ちゃんねる", "5ちゃんねる", "自宅", "職場", "学校", "カフェ", "図書館", "公園", "電車", "宇宙"];
const FOOD_OPTIONS = ["ラーメン", "寿司", "カレー", "ハンバーガー", "ピザ", "うどん", "そば", "焼肉", "刺身", "天ぷら", "オムライス", "たこ焼き", "お好み焼き", "すき焼き", "鍋"];
const YEAR_OPTIONS = ["1990", "1995", "2000", "2005", "2010", "2015", "2020", "2024", "2025", "2030"];
const MON_OPTIONS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const DAY_OPTIONS = ["1日", "5日", "10日", "15日", "20日", "25日", "28日", "30日", "31日", "15日"];
const YAKYU_TEAMS = ["読売ジャイアンツ", "阪神タイガース", "広島東洋カープ", "中日ドラゴンズ", "横浜DeNAベイスターズ", "東京ヤクルトスワローズ", "福岡ソフトバンクホークス", "オリックス・バファローズ", "千葉ロッテマリーンズ", "埼玉西武ライオンズ", "東北楽天ゴールデンイーグルス", "北海道日本ハムファイターズ"];
const POKE_OPTIONS = ["ピカチュウ", "リザードン", "ミュウツー", "カビゴン", "ミュウ", "ルギア", "ホウオウ", "ガブリアス", "ルカリオ", "ゲッコウガ"];
const EXPO_OPTIONS = ["芸術展", "技術展", "科学展", "歴史展", "文化展", "写真展", "絵画展", "彫刻展", "デザイン展", "音楽展"];
const ETC_OPTIONS = ["などなど", "いろいろ", "その他", "雑多", "もろもろ", "あれこれ", "なんでも", "とにかく", "とりあえず", "適当"];

export const getBody = (seed: string): string => getSeededOption(seed + "body", BODY_OPTIONS);
export const getPower = (seed: string): string => getSeededOption(seed + "power", POWER_OPTIONS);
export const getWho = (seed: string): string => getSeededOption(seed + "who", WHO_OPTIONS);
export const getWhere = (seed: string): string => getSeededOption(seed + "where", WHERE_OPTIONS);
export const getHungry = (seed: string): string => getSeededOption(seed + "hungry", HUNGRY_OPTIONS);
export const getFood = (seed: string): string => getSeededOption(seed + "food", FOOD_OPTIONS);
export const getRandomYear = (seed: string): string => getSeededOption(seed + "year", YEAR_OPTIONS);
export const getRandomMon = (seed: string): string => getSeededOption(seed + "mon", MON_OPTIONS);
export const getRandomDay = (seed: string): string => getSeededOption(seed + "day", DAY_OPTIONS);
export const getYakyu = (seed: string): string => {
  const team1 = getSeededOption(seed + "yakyu1", YAKYU_TEAMS);
  const team2 = getSeededOption(seed + "yakyu2", YAKYU_TEAMS.filter(t => t !== team1));
  const score1 = Math.floor(seededRandom(seed + "score1") * 10);
  const score2 = Math.floor(seededRandom(seed + "score2") * 10);
  return `${team1} ${score1} - ${score2} ${team2}`;
};
export const getPoke = (seed: string): string => getSeededOption(seed + "poke", POKE_OPTIONS);
export const getExpo = (seed: string): string => getSeededOption(seed + "expo", EXPO_OPTIONS);
export const getEtc = (seed: string): string => getSeededOption(seed + "etc", ETC_OPTIONS);

export const evaluateExpression = (expr: string): string => {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, "");
    if (!sanitized) return "式が空です";
    const result = Function(`"use strict"; return (${sanitized})`)();
    return String(result);
  } catch {
    return "計算エラー";
  }
};

export const convertBase = (value: string, base: string): string => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return "無効な数値です";
  const b = parseInt(base, 10);
  if (isNaN(b) || b < 2 || b > 36) return "2～36の基数を指定してください";
  return num.toString(b);
};

export const getVersion = (): string => "KassanBBS v1.0.0";
