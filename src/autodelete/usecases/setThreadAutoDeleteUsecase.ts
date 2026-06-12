import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const setThreadAutoDeleteUsecase = async (
  { sql, logger }: VakContext,
  { threadIdRaw, daysRaw }: { threadIdRaw: string; daysRaw: number }
): Promise<Result<undefined, Error>> => {
  logger.info({
    operation: "setThreadAutoDelete",
    threadId: threadIdRaw,
    days: daysRaw,
    message: "Setting auto-delete for thread",
  });

  try {
    await sql`
      UPDATE threads
      SET auto_delete_at = NOW() + INTERVAL '${daysRaw} days'
      WHERE id = ${threadIdRaw}
    `;

    logger.info({
      operation: "setThreadAutoDelete",
      threadId: threadIdRaw,
      days: daysRaw,
      message: "Auto-delete set for thread successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "setThreadAutoDelete",
      error,
      threadId: threadIdRaw,
      message: `Database error while setting auto-delete: ${message}`,
    });
    return err(
      new DatabaseError(`自動削除設定中にエラーが発生しました: ${message}`, error)
    );
  }
};
