import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteNgWordRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteNgWord",
    id,
    message: "Deleting NG word from database",
  });

  try {
    const result = await sql`
      DELETE FROM ng_words WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteNgWord",
        id,
        message: "Failed to delete NG word, no rows affected",
      });
      return err(new DatabaseError("NGワードの削除に失敗しました"));
    }

    logger.info({
      operation: "deleteNgWord",
      id,
      message: "NG word deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteNgWord",
      error,
      id,
      message: `Database error while deleting NG word: ${message}`,
    });
    return err(
      new DatabaseError(
        `NGワードの削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
