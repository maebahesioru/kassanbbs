import { createRoute } from "honox/factory";

import { uploadImageUsecase } from "../../../src/imgur/usecases/uploadImageUsecase";
import { validateMimeType, isAllowedImageType } from "../../../src/imgur/services/mimeValidationService";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.json({ error: "Database not available" }, 500);
  }

  try {
    const body = await c.req.json<{ image: string; contentType?: string }>();
    const image = body.image;
    const declaredContentType = body.contentType;

    if (!image || typeof image !== "string") {
      return c.json({ error: "No image provided" }, 400);
    }

    if (declaredContentType && !isAllowedImageType(declaredContentType)) {
      logger.warn({
        operation: "api/upload",
        contentType: declaredContentType,
        message: "Declared Content-Type is not an allowed image type",
      });
      return c.json({ error: "許可されていないファイル形式です" }, 400);
    }

    const binaryString = atob(image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const fileBuffer = bytes.buffer;

    const mimeResult = await validateMimeType(
      fileBuffer,
      declaredContentType ?? "application/octet-stream"
    );

    if (!mimeResult.valid) {
      logger.warn({
        operation: "api/upload",
        declaredContentType,
        detectedType: mimeResult.detectedType,
        reason: mimeResult.reason,
        message: "MIME type validation failed",
      });
      return c.json({ error: mimeResult.reason ?? "ファイル形式の検証に失敗しました" }, 400);
    }

    if (declaredContentType && declaredContentType !== mimeResult.detectedType) {
      logger.warn({
        operation: "api/upload",
        declaredContentType,
        detectedType: mimeResult.detectedType,
        message: "MIME type mismatch between declared and detected type",
      });
      return c.json({ error: "ファイル形式が宣言された形式と一致しません" }, 400);
    }

    logger.info({
      operation: "api/upload",
      detectedType: mimeResult.detectedType,
      message: "Processing image upload request",
    });

    const result = await uploadImageUsecase({ sql, logger }, image, mimeResult.detectedType);

    if (result.isErr()) {
      logger.error({
        operation: "api/upload",
        error: result.error,
        message: "Image upload failed",
      });
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({ url: result.value });
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});
