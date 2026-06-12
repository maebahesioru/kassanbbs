const buildPermissionFlags = (hasCap: boolean, banLevel: number): string => {
  const B = hasCap ? "B" : "b";
  const C = hasCap ? "C" : "c";
  const D = hasCap ? "D" : "d";
  const P = banLevel < 1 ? "P" : "p";
  const T = banLevel < 1 ? "T" : "t";
  return `${B}x${C}${D}x${P}${T}`;
};

export const processNinpochoNameReplacements = (
  name: string,
  ninpochoData: { level: number; totalPosts: number; id: string; errorCount: number; hasCapPermission?: boolean }
): string => {
  let result = name;
  if (result.includes("!ninja")) {
    const permFlags = buildPermissionFlags(ninpochoData.hasCapPermission ?? false, ninpochoData.level);
    result = result.replace(
      "!ninja",
      `\u3010Lv=${ninpochoData.level},${ninpochoData.totalPosts}pt,ID:${ninpochoData.id},${permFlags}\u3011`
    );
  }
  if (result.includes("!id")) {
    result = result.replace("!id", ninpochoData.id);
  }
  if (result.includes("!time")) {
    const nextLevel = ninpochoData.level + 1;
    const postsNeeded = Math.max(0, (nextLevel * 50) - ninpochoData.totalPosts);
    result = result.replace("!time", `${postsNeeded}pt`);
  }
  if (result.includes("!lv")) {
    result = result.replace("!lv", `Lv${ninpochoData.level}`);
  }
  if (result.includes("!total")) {
    result = result.replace("!total", String(ninpochoData.totalPosts));
  }
  if (result.includes("!donguri")) {
    const donguri = "\u25CB".repeat(Math.min(ninpochoData.level, 10));
    result = result.replace("!donguri", `\u3010${donguri}\u3011`);
  }
  return result;
};
