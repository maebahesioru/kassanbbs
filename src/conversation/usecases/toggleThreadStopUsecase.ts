import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { createWriteThreadId } from "../domain/write/WriteThreadId";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const toggleThreadStopUsecase = async (
  vakContext: VakContext,
  { threadIdRaw }: { threadIdRaw: string }
): Promise<Result<void, Error>> => {
  const { logger, sql } = vakContext;

  logger.info({
    operation: "toggleThreadStop",
    threadId: threadIdRaw,
    message: "Starting thread stop toggle",
  });

  const writeThreadIdResult = createWriteThreadId(threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "toggleThreadStop",
      error: writeThreadIdResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread ID format",
    });
    return err(writeThreadIdResult.error);
  }

  try {
    await sql`UPDATE threads SET is_stopped = NOT is_stopped WHERE id = ${writeThreadIdResult.value.val}::uuid`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "toggleThreadStop",
      error,
      threadId: threadIdRaw,
      message: `Failed to toggle thread stop status: ${message}`,
    });
    return err(new ValidationError("スレッド停止状態の切り替えに失敗しました"));
  }

  logger.info({
    operation: "toggleThreadStop",
    threadId: threadIdRaw,
    message: "Successfully toggled thread stop status",
  });

  return ok(undefined);
};
