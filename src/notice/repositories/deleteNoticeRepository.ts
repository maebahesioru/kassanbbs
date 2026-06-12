import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteNoticeRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteNotice",
    id,
    message: "Deleting notice from database",
  });

  try {
    const result = await sql`
      DELETE FROM notices WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteNotice",
        id,
        message: "Failed to delete notice, no rows affected",
      });
      return err(new DatabaseError("お知らせの削除に失敗しました"));
    }

    logger.info({
      operation: "deleteNotice",
      id,
      message: "Notice deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteNotice",
      error,
      id,
      message: `Database error while deleting notice: ${message}`,
    });
    return err(
      new DatabaseError(
        `お知らせの削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
