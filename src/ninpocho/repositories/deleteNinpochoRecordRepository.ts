import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteNinpochoRecordRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteNinpochoRecord",
    id,
    message: "Deleting ninpocho record from database",
  });

  try {
    const result = await sql`
      DELETE FROM ninpocho_records WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteNinpochoRecord",
        id,
        message: "Failed to delete ninpocho record, no rows affected",
      });
      return err(new DatabaseError("忍法帖記録の削除に失敗しました"));
    }

    logger.info({
      operation: "deleteNinpochoRecord",
      id,
      message: "Ninpocho record deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteNinpochoRecord",
      error,
      id,
      message: `Database error while deleting ninpocho record: ${message}`,
    });
    return err(
      new DatabaseError(`忍法帖記録削除中にエラーが発生しました: ${message}`, error)
    );
  }
};
