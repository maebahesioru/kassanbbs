import { err, ok } from "neverthrow";

import { createWriteThreadId } from "../domain/write/WriteThreadId";
import { deleteThreadRepository } from "../repositories/deleteThreadRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteThreadUsecase = async (
  vakContext: VakContext,
  { threadIdRaw }: { threadIdRaw: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteThread",
    threadId: threadIdRaw,
    message: "Starting thread deletion",
  });

  const writeThreadIdResult = createWriteThreadId(threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "deleteThread",
      error: writeThreadIdResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread ID format",
    });
    return err(writeThreadIdResult.error);
  }

  logger.debug({
    operation: "deleteThread",
    threadId: threadIdRaw,
    message: "Deleting thread from database",
  });

  const deleteResult = await deleteThreadRepository(vakContext, {
    threadId: writeThreadIdResult.value,
  });
  if (deleteResult.isErr()) {
    logger.error({
      operation: "deleteThread",
      error: deleteResult.error,
      threadId: threadIdRaw,
      message: "Failed to delete thread",
    });
    return err(deleteResult.error);
  }

  logger.info({
    operation: "deleteThread",
    threadId: threadIdRaw,
    message: "Thread deleted successfully",
  });

  return ok(undefined);
};
