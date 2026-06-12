import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const unarchiveThreadRepository = async (
  { sql, logger }: VakContext,
  threadId: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "unarchiveThread",
    threadId,
    message: "Unarchiving thread (setting is_stopped=FALSE, is_pooled=FALSE)",
  });

  try {
    const result = await sql<
      { id: string }[]
    >`
      UPDATE
        threads
      SET
        is_stopped = FALSE,
        is_pooled = FALSE
      WHERE
        id = ${threadId}::uuid
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "unarchiveThread",
        threadId,
        message: "Failed to unarchive thread, invalid database response",
      });
      return err(new DatabaseError("スレッドのアーカイブ解除に失敗しました"));
    }

    logger.info({
      operation: "unarchiveThread",
      threadId,
      message: "Thread unarchived successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "unarchiveThread",
      threadId,
      error,
      message: `Database error while unarchiving thread: ${message}`,
    });
    return err(
      new DatabaseError(`アーカイブ解除処理中にエラーが発生しました: ${message}`, error)
    );
  }
};
