import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { WriteThreadId } from "../domain/write/WriteThreadId";
import type { Result } from "neverthrow";

export const updateThreadStoppedRepository = async (
  { sql, logger }: VakContext,
  { threadId, isStopped }: { threadId: WriteThreadId; isStopped: boolean }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateThreadStopped",
    threadId: threadId.val,
    isStopped,
    message: "Updating thread stopped status",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE
            threads
        SET
            is_stopped = ${isStopped}
        WHERE
            id = ${threadId.val}::uuid RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateThreadStopped",
        threadId: threadId.val,
        message: "Failed to update thread stopped status, invalid database response",
      });
      return err(new DatabaseError("スレッドの停止状態の更新に失敗しました"));
    }

    logger.info({
      operation: "updateThreadStopped",
      threadId: threadId.val,
      isStopped,
      message: "Thread stopped status updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateThreadStopped",
      threadId: threadId.val,
      error,
      message: `Database error while updating thread stopped status: ${message}`,
    });
    return err(
      new DatabaseError(`停止状態の更新処理中にエラーが発生しました: ${message}`, error)
    );
  }
};
