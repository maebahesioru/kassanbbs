export const appendThreadTitleId = (
  title: string,
  params: { capName?: string; hashId: string; isCapUser: boolean }
): string => {
  if (params.isCapUser && params.capName) {
    return `${title} [${params.capName}\u2605]`;
  }
  return `${title} [${params.hashId.substring(0, 8)}\u2605]`;
};
