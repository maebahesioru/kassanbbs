import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteSambaTrackingRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteSambaTracking",
    id,
    message: "Deleting samba tracking record from database",
  });

  try {
    const result = await sql`
      DELETE FROM samba_tracking WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteSambaTracking",
        id,
        message: "Failed to delete samba tracking record, no rows affected",
      });
      return err(new DatabaseError("サンバ追跡記録の削除に失敗しました"));
    }

    logger.info({
      operation: "deleteSambaTracking",
      id,
      message: "Samba tracking record deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteSambaTracking",
      error,
      id,
      message: `Database error while deleting samba tracking record: ${message}`,
    });
    return err(
      new DatabaseError(`サンバ追跡記録削除中にエラーが発生しました: ${message}`, error)
    );
  }
};
