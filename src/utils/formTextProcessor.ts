import { fixChMateEmoji } from "./chMateEmojiFix";
import { normalizeWaveDash } from "./waveDashNormalize";

export const processFormText = (text: string): string => {
  let result = text.normalize('NFC');
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
  result = result.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  result = normalizeWaveDash(result);
  result = fixChMateEmoji(result);
  result = result.replace(/<b><\/b>/g, "");
  result = result.replace(/[ \t\u3000]+(?=<br>)/g, "");
  result = result.replace(/(?:\s*<br>\s*)+$/, "");
  result = result.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\u202A-\u202E]/g, '');
  return result;
};
