import { err, ok } from "neverthrow";

import { unarchiveThreadRepository } from "../repositories/unarchiveThreadRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const unarchiveThreadUsecase = async (
  vakContext: VakContext,
  { threadIdRaw }: { threadIdRaw: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "unarchiveThreadUsecase",
    threadId: threadIdRaw,
    message: "Starting thread unarchive",
  });

  const unarchiveResult = await unarchiveThreadRepository(vakContext, threadIdRaw);
  if (unarchiveResult.isErr()) {
    logger.error({
      operation: "unarchiveThreadUsecase",
      error: unarchiveResult.error,
      threadId: threadIdRaw,
      message: "Failed to unarchive thread",
    });
    return err(unarchiveResult.error);
  }

  logger.info({
    operation: "unarchiveThreadUsecase",
    threadId: threadIdRaw,
    message: "Thread unarchived successfully",
  });

  return ok(undefined);
};
