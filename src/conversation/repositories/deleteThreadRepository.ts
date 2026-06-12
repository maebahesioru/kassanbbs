import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { WriteThreadId } from "../domain/write/WriteThreadId";
import type { Result } from "neverthrow";

export const deleteThreadRepository = async (
  { sql, logger }: VakContext,
  { threadId }: { threadId: WriteThreadId }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteThread",
    threadId: threadId.val,
    message: "Deleting thread and responses from database",
  });

  try {
    const result = await sql`
      DELETE FROM threads WHERE id = ${threadId.val}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteThread",
        threadId: threadId.val,
        message: "Failed to delete thread, no rows affected",
      });
      return err(new DatabaseError("スレッドの削除に失敗しました"));
    }

    logger.info({
      operation: "deleteThread",
      threadId: threadId.val,
      message: "Thread deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteThread",
      threadId: threadId.val,
      error,
      message: `Database error while deleting thread: ${message}`,
    });
    return err(
      new DatabaseError(
        `スレッド削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
