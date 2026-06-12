import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteFailureLogRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "deleteFailureLog", id, message: "Deleting failure log entry" });
  try {
    const result = await sql`
      DELETE FROM admin_logs
      WHERE id = ${id}::uuid AND log_type = 'FLR'
      RETURNING id
    `;
    if (!result || result.length !== 1) {
      return err(new DatabaseError("障害ログの削除に失敗しました"));
    }
    logger.info({ operation: "deleteFailureLog", id, message: "Failure log deleted successfully" });
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "deleteFailureLog", error, message: msg });
    return err(new DatabaseError(`障害ログの削除中にエラーが発生しました: ${msg}`, error));
  }
};