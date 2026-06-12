import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteBoardRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteBoard",
    id,
    message: "Soft-deleting board in database",
  });

  try {
    const result = await sql`
      UPDATE boards SET is_active = FALSE WHERE id = ${id}::uuid
    `;

    if (!result || result.count === 0) {
      logger.error({
        operation: "deleteBoard",
        id,
        message: "Board not found for deletion",
      });
      return err(new DatabaseError("板が見つかりません"));
    }

    logger.info({
      operation: "deleteBoard",
      id,
      message: "Board soft-deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteBoard",
      id,
      error,
      message: `Database error while deleting board: ${message}`,
    });
    return err(
      new DatabaseError(
        `板の削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
