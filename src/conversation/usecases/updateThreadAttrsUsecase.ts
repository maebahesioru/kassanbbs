import { err, ok } from "neverthrow";

import { createWriteThreadId } from "../domain/write/WriteThreadId";
import {
  createThreadAttr,
  type ThreadAttr,
} from "../domain/read/ReadThreadAttr";
import { updateThreadAttrsRepository } from "../repositories/updateThreadAttrsRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateThreadAttrsUsecase = async (
  vakContext: VakContext,
  { threadIdRaw, attrs }: { threadIdRaw: string; attrs: Record<string, unknown> }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateThreadAttrs",
    threadId: threadIdRaw,
    message: "Starting thread attributes update",
  });

  const writeThreadIdResult = createWriteThreadId(threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "updateThreadAttrs",
      error: writeThreadIdResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread ID format",
    });
    return err(writeThreadIdResult.error);
  }

  const attrsResult = createThreadAttr(attrs);
  if (attrsResult.isErr()) {
    logger.error({
      operation: "updateThreadAttrs",
      error: attrsResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread attributes",
    });
    return err(attrsResult.error);
  }

  logger.debug({
    operation: "updateThreadAttrs",
    threadId: threadIdRaw,
    message: "Persisting thread attributes to database",
  });

  const updateResult = await updateThreadAttrsRepository(vakContext, {
    threadId: writeThreadIdResult.value,
    attrs: attrsResult.value,
  });
  if (updateResult.isErr()) {
    logger.error({
      operation: "updateThreadAttrs",
      error: updateResult.error,
      threadId: threadIdRaw,
      message: "Failed to update thread attributes",
    });
    return err(updateResult.error);
  }

  logger.info({
    operation: "updateThreadAttrs",
    threadId: threadIdRaw,
    message: "Thread attributes updated successfully",
  });

  return ok(undefined);
};
