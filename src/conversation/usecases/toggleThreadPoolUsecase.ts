import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { createWriteThreadId } from "../domain/write/WriteThreadId";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const toggleThreadPoolUsecase = async (
  vakContext: VakContext,
  { threadIdRaw }: { threadIdRaw: string }
): Promise<Result<void, Error>> => {
  const { logger, sql } = vakContext;

  logger.info({
    operation: "toggleThreadPool",
    threadId: threadIdRaw,
    message: "Starting thread pool toggle",
  });

  const writeThreadIdResult = createWriteThreadId(threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "toggleThreadPool",
      error: writeThreadIdResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread ID format",
    });
    return err(writeThreadIdResult.error);
  }

  try {
    await sql`UPDATE threads SET is_pooled = NOT is_pooled WHERE id = ${writeThreadIdResult.value.val}::uuid`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "toggleThreadPool",
      error,
      threadId: threadIdRaw,
      message: `Failed to toggle thread pool status: ${message}`,
    });
    return err(new ValidationError("スレッドプール状態の切り替えに失敗しました"));
  }

  logger.info({
    operation: "toggleThreadPool",
    threadId: threadIdRaw,
    message: "Successfully toggled thread pool status",
  });

  return ok(undefined);
};
