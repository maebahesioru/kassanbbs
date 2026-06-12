import { getNoticesRepository } from "../repositories/getNoticesRepository";
import { createNoticeRepository } from "../repositories/createNoticeRepository";
import { updateNoticeRepository } from "../repositories/updateNoticeRepository";
import { deleteNoticeRepository } from "../repositories/deleteNoticeRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadNotice } from "../domain/read/ReadNotice";
import type { Result } from "neverthrow";

export const getNoticesUsecase = async (
  vakContext: VakContext,
  includeInactive = false
): Promise<Result<ReadNotice[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getNotices",
    includeInactive,
    message: "Retrieving notices list",
  });

  const result = await getNoticesRepository(vakContext, includeInactive);
  if (result.isErr()) {
    logger.error({
      operation: "getNotices",
      error: result.error,
      includeInactive,
      message: "Failed to retrieve notices list",
    });
    return result;
  }

  logger.info({
    operation: "getNotices",
    count: result.value.length,
    includeInactive,
    message: "Notices list retrieved successfully",
  });

  return result;
};

export const createNoticeUsecase = async (
  vakContext: VakContext,
  params: {
    title: string;
    content: string;
    targetType: string;
    targetValue: string;
    expiresAt: Date | null;
  }
): Promise<Result<ReadNotice, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "createNotice",
    title: params.title,
    message: "Creating new notice",
  });

  const result = await createNoticeRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "createNotice",
      error: result.error,
      title: params.title,
      message: "Failed to create notice",
    });
    return result;
  }

  logger.info({
    operation: "createNotice",
    id: result.value.id,
    title: params.title,
    message: "Notice created successfully",
  });

  return result;
};

export const updateNoticeUsecase = async (
  vakContext: VakContext,
  params: {
    id: string;
    title: string;
    content: string;
    targetType: string;
    targetValue: string;
    isActive: boolean;
    expiresAt: Date | null;
  }
): Promise<Result<ReadNotice, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateNotice",
    id: params.id,
    message: "Updating notice",
  });

  const result = await updateNoticeRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "updateNotice",
      error: result.error,
      id: params.id,
      message: "Failed to update notice",
    });
    return result;
  }

  logger.info({
    operation: "updateNotice",
    id: params.id,
    message: "Notice updated successfully",
  });

  return result;
};

export const deleteNoticeUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteNotice",
    id,
    message: "Deleting notice",
  });

  const result = await deleteNoticeRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteNotice",
      error: result.error,
      id,
      message: "Failed to delete notice",
    });
    return result;
  }

  logger.info({
    operation: "deleteNotice",
    id,
    message: "Notice deleted successfully",
  });

  return result;
};
