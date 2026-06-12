import { ICONS } from "../data/icons";

export const ICON_PREFIX_REGEX = /^◆\s*([0-9A-Za-z]+)\s*/;

export type IconResult = {
  icon: string | null;
  cleanedName: string;
};

export const parseIcon = (name: string): IconResult => {
  const match = name.match(ICON_PREFIX_REGEX);
  if (match) {
    const iconCode = match[1];
    const iconChar = ICONS[iconCode];
    if (iconChar) {
      return { icon: iconChar, cleanedName: name.substring(match[0].length) };
    }
  }
  return { icon: null, cleanedName: name };
};
