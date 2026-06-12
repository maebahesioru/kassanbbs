export const COLOR_NAME_REGEX = /^@([0-9A-Fa-f]{6})@/;

export type ColorNameResult = {
  color: string | null;
  cleanedName: string;
};

export const parseColorName = (name: string): ColorNameResult => {
  const match = name.match(COLOR_NAME_REGEX);
  if (match) {
    return {
      color: `#${match[1]}`,
      cleanedName: name.substring(match[0].length),
    };
  }
  return { color: null, cleanedName: name };
};

export const isValidNameColor = (hexColor: string): boolean => {
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.15;
};
