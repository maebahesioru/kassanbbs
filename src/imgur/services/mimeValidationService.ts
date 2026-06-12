export type MimeValidationResult = {
  valid: boolean;
  detectedType: string;
  reason?: string;
};

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
];

export const isAllowedImageType = (mimeType: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
};

export const validateMimeType = async (
  fileBuffer: ArrayBuffer,
  declaredMimeType: string
): Promise<MimeValidationResult> => {
  const bytes = new Uint8Array(fileBuffer.slice(0, 12));

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { valid: true, detectedType: "image/png" };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { valid: true, detectedType: "image/gif" };
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, detectedType: "image/webp" };
  }

  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return { valid: true, detectedType: "image/bmp" };
  }

  const textDecoder = new TextDecoder();
  const header = textDecoder.decode(bytes).toLowerCase();
  if (header.includes("<svg") || header.includes("<?xml")) {
    return { valid: true, detectedType: "image/svg+xml" };
  }

  return {
    valid: false,
    detectedType: "unknown",
    reason: "不明なファイル形式です",
  };
};

export const getMaxFileSize = (mimeType: string): number => {
  if (mimeType === "image/gif" || mimeType.startsWith("video/")) {
    return 200 * 1024 * 1024;
  }
  return 50 * 1024 * 1024;
};
