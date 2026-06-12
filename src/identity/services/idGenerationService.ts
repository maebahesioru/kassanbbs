import crypto from "crypto";

export const generateBbsId = (
  params: {
    server: string;
    bbs: string;
    sessionId?: string;
    ip: string;
    userAgent: string;
    provider: string;
    date: Date;
  },
  column: number = 8
): string => {
  const ipParts = params.ip.includes(":")
    ? params.ip.split(":")
    : params.ip.split(".");

  let provider = params.provider;
  if (provider) {
    provider = provider.replace(/ne\.jp/g, "nejp");
    provider = provider.replace(/ad\.jp/g, "adjp");
    provider = provider.replace(/or\.jp/g, "orjp");
    const d = provider.split(".");
    if (d.length >= 2) {
      provider = d[d.length - 2] + d[d.length - 1];
    }
  }

  const hash = crypto.createHash("md5");
  hash.update("ex0ch ID Generation");
  hash.update(":");
  hash.update(params.server);
  hash.update(":");
  hash.update(params.bbs);

  if (params.sessionId) {
    hash.update(":");
    hash.update(params.sessionId);
  } else {
    hash.update(":");
    hash.update(
      ipParts[0] +
      ipParts[1] +
      (ipParts.length > 4 ? ipParts[2] + ipParts[3] : "") +
      provider
    );
    hash.update(":");
    hash.update(params.userAgent);
  }

  hash.update(":");
  hash.update(`${params.date.getDate()}-${params.date.getMonth()}-${params.date.getFullYear() - 1900}`);
  hash.update(":");
  hash.update("0");

  const id = hash.digest("base64");
  return id.substring(0, column);
};
