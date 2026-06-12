export const detectMultiPost = (
  postHistory: Array<{ contentHash: string; postedAt: Date }>,
  currentHash: string,
  thresholdMs: number = 30000
): boolean => {
  const now = new Date();
  const count = postHistory.filter(p =>
    p.contentHash === currentHash &&
    (now.getTime() - p.postedAt.getTime()) < thresholdMs
  ).length;
  return count >= 3;
};
