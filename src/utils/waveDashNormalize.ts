export const normalizeWaveDash = (text: string): string => {
  return text.replace(/\u301C/g, "\uFF5E");
};
