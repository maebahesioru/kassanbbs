import { err } from "neverthrow";

import { getImgurConfigRepository } from "../repositories/getImgurConfigRepository";
import { uploadToImgur } from "../services/imgurService";
import { validateMimeType, getMaxFileSize, isAllowedImageType } from "../services/mimeValidationService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const uploadImageUsecase = async (
  vakContext: VakContext,
  imageBase64: string,
  declaredMimeType?: string
): Promise<Result<string, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "uploadImage",
    hasDeclaredMimeType: declaredMimeType !== undefined,
    message: "Starting image upload to Imgur",
  });

  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const fileBuffer = bytes.buffer;

  if (declaredMimeType) {
    if (!isAllowedImageType(declaredMimeType)) {
      logger.warn({
        operation: "uploadImage",
        declaredMimeType,
        message: "Declared MIME type is not an allowed image type",
      });
      return err(new Error("許可されていないファイル形式です"));
    }

    const maxSize = getMaxFileSize(declaredMimeType);
    if (fileBuffer.byteLength > maxSize) {
      logger.warn({
        operation: "uploadImage",
        fileSize: fileBuffer.byteLength,
        maxSize,
        mimeType: declaredMimeType,
        message: "File exceeds maximum allowed size",
      });
      return err(new Error("ファイルサイズが上限を超えています"));
    }
  }

  const mimeResult = await validateMimeType(
    fileBuffer,
    declaredMimeType ?? "application/octet-stream"
  );

  if (!mimeResult.valid) {
    logger.warn({
      operation: "uploadImage",
      declaredMimeType,
      detectedType: mimeResult.detectedType,
      reason: mimeResult.reason,
      message: "MIME type validation failed",
    });
    return err(new Error(mimeResult.reason ?? "ファイル形式の検証に失敗しました"));
  }

  if (declaredMimeType && declaredMimeType !== mimeResult.detectedType) {
    logger.warn({
      operation: "uploadImage",
      declaredMimeType,
      detectedType: mimeResult.detectedType,
      message: "MIME type mismatch between declared and detected type",
    });
    return err(new Error("ファイル形式が宣言された形式と一致しません"));
  }

  logger.info({
    operation: "uploadImage",
    detectedType: mimeResult.detectedType,
    fileSize: fileBuffer.byteLength,
    message: "MIME validation passed",
  });

  const configResult = await getImgurConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "uploadImage",
      error: configResult.error,
      message: "Failed to get Imgur configuration",
    });
    return err(configResult.error);
  }

  const { clientId } = configResult.value;

  logger.debug({
    operation: "uploadImage",
    message: "Uploading image to Imgur",
  });

  const uploadResult = await uploadToImgur(imageBase64, clientId);
  if (uploadResult.isErr()) {
    logger.error({
      operation: "uploadImage",
      error: uploadResult.error,
      message: "Failed to upload image to Imgur",
    });
    return uploadResult;
  }

  logger.info({
    operation: "uploadImage",
    url: uploadResult.value,
    message: "Image uploaded successfully",
  });

  return uploadResult;
};
