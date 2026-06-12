import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const setThreadPositionRepository = async (
  { sql, logger }: VakContext,
  { threadId, updatedAt }: { threadId: string; updatedAt: Date }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "setThreadPosition",
    threadId,
    updatedAt: updatedAt.toISOString(),
    message: "Setting thread position timestamp",
  });

  try {
    const result = await sql<{ id: string }[]>`
      UPDATE threads
      SET updated_at = ${updatedAt}
      WHERE id = ${threadId}::uuid
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "setThreadPosition",
        threadId,
        message: "Failed to set thread position, invalid database response",
      });
      return err(new DatabaseError("スレッド位置の更新に失敗しました"));
    }

    logger.info({
      operation: "setThreadPosition",
      threadId,
      updatedAt: updatedAt.toISOString(),
      message: "Thread position updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "setThreadPosition",
      threadId,
      error,
      message: `Database error while setting thread position: ${message}`,
    });
    return err(
      new DatabaseError(`スレッド位置更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
