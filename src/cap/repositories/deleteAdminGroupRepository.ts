import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteAdminGroupRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteAdminGroup",
    id,
    message: "Deleting admin group from database",
  });

  try {
    const result = await sql`
      DELETE FROM admin_groups WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteAdminGroup",
        id,
        message: "Failed to delete admin group, no rows affected",
      });
      return err(new DatabaseError("管理者グループの削除に失敗しました"));
    }

    logger.info({
      operation: "deleteAdminGroup",
      id,
      message: "Admin group deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteAdminGroup",
      error,
      id,
      message: `Database error while deleting admin group: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者グループの削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
