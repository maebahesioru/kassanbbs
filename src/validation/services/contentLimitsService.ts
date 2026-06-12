export type ContentLimitConfig = {
  maxLines: number;
  maxLineWidth: number;
  maxAnchors: number;
};

export type ContentLimitResult = {
  valid: boolean;
  lineCount: number;
  maxLineWidth: number;
  anchorCount: number;
  reason?: string;
};

export const checkContentLimits = (
  content: string,
  config: ContentLimitConfig
): ContentLimitResult => {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const lineCount = lines.length;
  const maxLineWidth = Math.max(...lines.map((l) => l.length));
  const anchorCount = (content.match(/>>\d+/g) || []).length;

  if (lineCount > config.maxLines) {
    return {
      valid: false,
      lineCount,
      maxLineWidth,
      anchorCount,
      reason: `行数が多すぎます（最大${config.maxLines}行）`,
    };
  }
  if (maxLineWidth > config.maxLineWidth) {
    return {
      valid: false,
      lineCount,
      maxLineWidth,
      anchorCount,
      reason: `1行の文字数が多すぎます（最大${config.maxLineWidth}文字）`,
    };
  }
  if (anchorCount > config.maxAnchors) {
    return {
      valid: false,
      lineCount,
      maxLineWidth,
      anchorCount,
      reason: `アンカーが多すぎます（最大${config.maxAnchors}個）`,
    };
  }

  return { valid: true, lineCount, maxLineWidth, anchorCount };
};
