import crypto from "crypto";

export const generateNinpochoHashId = (ipAddress: string): string => {
  const hash = crypto
    .createHash("md5")
    .update(ipAddress)
    .update(new Date().toDateString())
    .digest("base64");
  return hash.substring(0, 8);
};
