export type SlipLevel = "vvv" | "vvvv" | "vvvvv" | "vvvvvv";

export type CarrierInfo = {
  carrier: string;
  nickname: string;
  type: "mobile" | "wifi" | "fixed" | "unknown";
};

const CARRIER_PATTERNS: Array<{ regex: RegExp; name: string; nickname: string; type: CarrierInfo["type"] }> = [
  // docomo (i-mode)
  { regex: /\.docomo\.ne\.jp$/i, name: "docomo", nickname: "ｵｯﾍﾟｹｰ", type: "mobile" },
  { regex: /\.mopera\.ne\.jp$/i, name: "mopera", nickname: "ﾓﾍﾟﾗ", type: "mobile" },
  { regex: /\.dip\.jp$/i, name: "docomo", nickname: "ｵｯﾍﾟｹｰ", type: "mobile" },
  // au (KDDI)
  { regex: /\.au\.com$/i, name: "au", nickname: "ｻｻｸｯﾃﾛﾗ", type: "mobile" },
  { regex: /\.ezweb\.ne\.jp$/i, name: "ezweb", nickname: "ｻｻｸｯﾃﾛﾗ", type: "mobile" },
  // SoftBank
  { regex: /\.softbank\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.vodafone\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-d\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-c\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-h\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-t\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-k\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-s\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-p\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-n\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-r\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  { regex: /\.jp\-u\.ne\.jp$/i, name: "softbank", nickname: "ﾊｹﾞ", type: "mobile" },
  // Willcom
  { regex: /\.willcom\.com$/i, name: "willcom", nickname: "ｽﾌﾟｰ", type: "mobile" },
  { regex: /\.pdx\.ne\.jp$/i, name: "willcom", nickname: "ｽﾌﾟｰ", type: "mobile" },
  // EMOBILE
  { regex: /\.emobile\.ne\.jp$/i, name: "emobile", nickname: "ｲｰﾓﾊﾞ", type: "mobile" },
  // Rakuten Mobile
  { regex: /\.rakuten\.jp$/i, name: "rakuten", nickname: "楽天", type: "mobile" },
  { regex: /\.mobile\.rakuten\.com$/i, name: "rakuten-mobile", nickname: "楽天モバイル", type: "mobile" },
  // B-Mobile
  { regex: /\.bmobile\.ne\.jp$/i, name: "bmobile", nickname: "B", type: "mobile" },
  // mineo
  { regex: /\.mineo\.jp$/i, name: "mineo", nickname: "みねお", type: "mobile" },
  // OCN
  { regex: /\.ocn\.ne\.jp$/i, name: "ocn", nickname: "OCN", type: "fixed" },
  // NTT
  { regex: /\.ntt\.(ne|co)\.jp$/i, name: "ntt", nickname: "NTT", type: "fixed" },
  // UQ Wimax
  { regex: /\.uqwimax\.jp$/i, name: "uq", nickname: "UQ", type: "mobile" },
  // WiFi (public hotspots)
  { regex: /wi2/i, name: "wi2", nickname: "Wi2", type: "wifi" },
  { regex: /m-zone/i, name: "mzone", nickname: "Mzone", type: "wifi" },
  { regex: /dion/i, name: "dion", nickname: "DION", type: "fixed" },
  { regex: /vectant/i, name: "vectant", nickname: "VECTANT", type: "fixed" },
  { regex: /lson/i, name: "lson", nickname: "livedoor", type: "fixed" },
];

export const detectCarrier = (hostname: string): CarrierInfo => {
  for (const pattern of CARRIER_PATTERNS) {
    if (pattern.regex.test(hostname)) {
      return { carrier: pattern.name, nickname: pattern.nickname, type: pattern.type };
    }
  }
  return { carrier: "unknown", nickname: "ﾜｯﾁｮｲ", type: "unknown" };
};

export const detectAnonymousConnection = (hostname: string): { isAnonymous: boolean; type: string } => {
  const patterns: Array<{ regex: RegExp; type: string }> = [
    { regex: /\.vpngate\./i, type: "VPN Gate" },
    { regex: /\.opengw\.net$/i, type: "OpenGW" },
    { regex: /\.torproject\.|\.tor\.exit|tor-exit/i, type: "Tor" },
    { regex: /\.amazonaws\.com$/i, type: "AWS" },
    { regex: /\.googleusercontent\.com$/i, type: "GCP" },
    { regex: /\.azure\.com$/i, type: "Azure" },
    { regex: /\.digitalocean\.com$/i, type: "DigitalOcean" },
    { regex: /\.linode\.com$/i, type: "Linode" },
    { regex: /\.vultr\.com$/i, type: "Vultr" },
    { regex: /\.ovh\./i, type: "OVH" },
    { regex: /\.sakura\.ne\.jp$/i, type: "さくら" },
    { regex: /\.xrea\.com$/i, type: "XREA" },
    { regex: /\.vps\./i, type: "VPS" },
    { regex: /\.dedicated\./i, type: "Dedicated" },
    { regex: /\.datacenter\./i, type: "DC" },
    { regex: /\.colo\./i, type: "Colo" },
    { regex: /\.host\./i, type: "Hosting" },
  ];
  for (const p of patterns) {
    if (p.regex.test(hostname)) return { isAnonymous: true, type: p.type };
  }
  return { isAnonymous: false, type: "" };
};

export const detectPublicWifi = (hostname: string): string | null => {
  const patterns: Array<{ regex: RegExp; name: string }> = [
    { regex: /wi2/i, name: "Wi2" },
    { regex: /m-zone/i, name: "Mzone" },
    { regex: /dion/i, name: "DION" },
    { regex: /lson/i, name: "livedoor" },
    { regex: /vectant/i, name: "VECTANT" },
    { regex: /hotspot/i, name: "HotSpot" },
    { regex: /free-wifi/i, name: "FreeWiFi" },
    { regex: /starbucks/i, name: "Starbucks" },
    { regex: /mcdonalds/i, name: "McDonalds" },
    { regex: /7spot|seven-eleven/i, name: "7SPOT" },
    { regex: /familymart|famima/i, name: "Famima" },
    { regex: /lawson/i, name: "Lawson" },
    { regex: /\.wifi\./i, name: "WiFi" },
  ];
  for (const p of patterns) {
    if (p.regex.test(hostname)) return p.name;
  }
  return null;
};

export const getWeeklySeed = (securityKey: string): string => {
  const now = new Date();
  const day = now.getDay();
  const wednesdayOffset = (day + 7 - 3) % 7;
  const wednesday = new Date(now);
  wednesday.setDate(now.getDate() - wednesdayOffset);
  wednesday.setHours(9, 0, 0, 0);
  const seed = `${securityKey}:${wednesday.toISOString().split("T")[0]}`;
  return seed;
};

export const generateSlipParts = (securityKey: string, ip: string): { aa: string; bb: string; cccc: string } => {
  const seed = getWeeklySeed(securityKey);
  const combined = `${seed}:${ip}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
  return {
    aa: hex.substring(0, 2),
    bb: hex.substring(2, 4),
    cccc: hex.substring(4, 8),
  };
};

export const generateSlip = (ip: string, userAgent: string, acceptLanguage: string): string => {
  const ipPrefix = ip.split(".").slice(0, 3).join(".");
  const uaShort = userAgent.substring(0, 50);
  const combined = `${ipPrefix}:${uaShort}:${acceptLanguage}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  const id = Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
  return `SLIP:${id}`;
};

export const generateMultiLevelSlip = (
  ip: string,
  userAgent: string,
  level: SlipLevel,
  securityKey: string
): string => {
  const ipPrefix = ip.split(".").slice(0, 3).join(".");
  const parts = generateSlipParts(securityKey, ip);
  const aa_bb_cccc = `${parts.aa}-${parts.bb}-${parts.cccc}`;

  switch (level) {
    case "vvv":
      return "???";
    case "vvvv":
      return `${ipPrefix}.xxx`;
    case "vvvvv":
      return `${aa_bb_cccc}`;
    case "vvvvvv":
      return `${aa_bb_cccc}-${ipPrefix}.xxx`;
  }
};

export const generateWattyoi = (
  ip: string,
  hostname: string,
  userAgent: string,
  securityKey: string,
  level: string
): string => {
  const parts = generateSlipParts(securityKey, ip);
  const ipPrefix = ip.split(".").slice(0, 3).join(".");
  const carrier = detectCarrier(hostname);
  const anon = detectAnonymousConnection(hostname);
  const wifi = detectPublicWifi(hostname);

  let nickname: string;
  if (anon.isAnonymous) nickname = anon.type;
  else if (wifi) nickname = wifi;
  else nickname = carrier.nickname;

  switch (level) {
    case "vvv": return `${nickname}`;
    case "vvvv": return `${nickname}${ipPrefix}.xxx`;
    case "vvvvv": return `${nickname}${parts.aa}-${parts.bb}-${parts.cccc}`;
    case "vvvvvv": return `${nickname}${parts.aa}-${parts.bb}-${parts.cccc}-${ipPrefix}.xxx`;
    default: return `${nickname}${parts.aa}-${parts.bb}-${parts.cccc}`;
  }
};
