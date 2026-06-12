export const calculateGoldReward = (postLength: number, isFirstPost: boolean): number => {
  if (isFirstPost) return 3;
  if (postLength > 500) return 2;
  return 1;
};

export const calculatePostCost = (hasImage: boolean): number => {
  if (hasImage) return 1;
  return 0;
};
