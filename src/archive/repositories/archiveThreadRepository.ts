import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const archiveThreadRepository = async (
  { sql, logger }: VakContext,
  threadId: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "archiveThread",
    threadId,
    message: "Archiving thread (setting is_stopped=TRUE, is_pooled=TRUE)",
  });

  try {
    const result = await sql<
      { id: string }[]
    >`
      UPDATE
        threads
      SET
        is_stopped = TRUE,
        is_pooled = TRUE
      WHERE
        id = ${threadId}::uuid
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "archiveThread",
        threadId,
        message: "Failed to archive thread, invalid database response",
      });
      return err(new DatabaseError("スレッドのアーカイブに失敗しました"));
    }

    logger.info({
      operation: "archiveThread",
      threadId,
      message: "Thread archived successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "archiveThread",
      threadId,
      error,
      message: `Database error while archiving thread: ${message}`,
    });
    return err(
      new DatabaseError(`アーカイブ処理中にエラーが発生しました: ${message}`, error)
    );
  }
};
