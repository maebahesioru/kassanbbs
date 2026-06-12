import { err, ok } from "neverthrow";

import { archiveThreadRepository } from "../repositories/archiveThreadRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const archiveThreadUsecase = async (
  vakContext: VakContext,
  { threadIdRaw }: { threadIdRaw: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "archiveThreadUsecase",
    threadId: threadIdRaw,
    message: "Starting thread archive",
  });

  const archiveResult = await archiveThreadRepository(vakContext, threadIdRaw);
  if (archiveResult.isErr()) {
    logger.error({
      operation: "archiveThreadUsecase",
      error: archiveResult.error,
      threadId: threadIdRaw,
      message: "Failed to archive thread",
    });
    return err(archiveResult.error);
  }

  logger.info({
    operation: "archiveThreadUsecase",
    threadId: threadIdRaw,
    message: "Thread archived successfully",
  });

  return ok(undefined);
};
