import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { hashContent } from "../services/hashContentService";
import { checkDuplicateResponseRepository } from "../repositories/checkDuplicateResponseRepository";
import { checkDuplicateTitleRepository } from "../repositories/checkDuplicateTitleRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkResponseDuplicateUsecase = async (
  vakContext: VakContext,
  params: { content: string; ipAddress: string; threadId: string }
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.debug({
    operation: "checkResponseDuplicate",
    threadId: params.threadId,
    message: "Checking for duplicate response",
  });

  const hash = await hashContent(params.content);
  const result = await checkDuplicateResponseRepository(vakContext, {
    contentHash: hash,
    ipAddress: params.ipAddress,
    threadId: params.threadId,
  });

  if (result.isErr()) return err(result.error);

  if (result.value) {
    logger.warn({
      operation: "checkResponseDuplicate",
      threadId: params.threadId,
      message: "Duplicate response detected",
    });
    return err(
      new ValidationError("短時間に同じ内容の投稿はできません")
    );
  }

  return ok(true);
};

export const checkTitleDuplicateUsecase = async (
  vakContext: VakContext,
  title: string
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.debug({
    operation: "checkTitleDuplicate",
    title,
    message: "Checking for duplicate thread title",
  });

  const result = await checkDuplicateTitleRepository(vakContext, title);

  if (result.isErr()) return err(result.error);

  if (result.value) {
    logger.warn({
      operation: "checkTitleDuplicate",
      title,
      message: "Duplicate thread title detected",
    });
    return err(
      new ValidationError("同じタイトルのスレッドが既に存在します")
    );
  }

  return ok(true);
};
