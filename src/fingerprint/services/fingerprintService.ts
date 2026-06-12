export const analyzeFingerprint = (
  fpJson: string
): { isSuspicious: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  try {
    const fp = JSON.parse(fpJson);
    if (!fp || typeof fp !== "object")
      return { isSuspicious: true, reasons: ["\u7121\u52B9\u306A\u6307\u7D0B\u30C7\u30FC\u30BF"] };

    if (fp.canvas === "unsupported") reasons.push("Canvas\u672A\u5BFE\u5FDC");

    if (
      fp.webgl === "unsupported" &&
      fp.platform &&
      !fp.platform.includes("Win")
    ) {
      reasons.push("WebGL\u975E\u5BFE\u5FDC(\u975EWindows)");
    }

    if (fp.screen === "0x0x0" || fp.screen === "800x600x24") {
      reasons.push("\u753B\u9762\u30B5\u30A4\u30BA\u304C\u7570\u5E38");
    }
  } catch {
    return { isSuspicious: true, reasons: ["\u6307\u7D0B\u30C7\u30FC\u30BF\u306E\u89E3\u6790\u306B\u5931\u6557"] };
  }

  return { isSuspicious: reasons.length > 0, reasons };
};
