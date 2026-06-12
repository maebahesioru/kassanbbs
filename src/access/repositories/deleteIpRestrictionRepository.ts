import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteIpRestrictionRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteIpRestriction",
    id,
    message: "Deleting IP restriction from database",
  });

  try {
    const result = await sql`
      DELETE FROM ip_restrictions WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteIpRestriction",
        id,
        message: "Failed to delete IP restriction, no rows affected",
      });
      return err(new DatabaseError("IP制限の削除に失敗しました"));
    }

    logger.info({
      operation: "deleteIpRestriction",
      id,
      message: "IP restriction deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteIpRestriction",
      error,
      id,
      message: `Database error while deleting IP restriction: ${message}`,
    });
    return err(
      new DatabaseError(
        `IP制限の削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
