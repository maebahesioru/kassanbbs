import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { WriteThreadId } from "../domain/write/WriteThreadId";
import type { Result } from "neverthrow";

export const updateThreadPooledRepository = async (
  { sql, logger }: VakContext,
  { threadId, isPooled }: { threadId: WriteThreadId; isPooled: boolean }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateThreadPooled",
    threadId: threadId.val,
    isPooled,
    message: "Updating thread pooled status",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE
            threads
        SET
            is_pooled = ${isPooled}
        WHERE
            id = ${threadId.val}::uuid RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateThreadPooled",
        threadId: threadId.val,
        message: "Failed to update thread pooled status, invalid database response",
      });
      return err(new DatabaseError("スレッドのプール状態の更新に失敗しました"));
    }

    logger.info({
      operation: "updateThreadPooled",
      threadId: threadId.val,
      isPooled,
      message: "Thread pooled status updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateThreadPooled",
      threadId: threadId.val,
      error,
      message: `Database error while updating thread pooled status: ${message}`,
    });
    return err(
      new DatabaseError(`プール状態の更新処理中にエラーが発生しました: ${message}`, error)
    );
  }
};
