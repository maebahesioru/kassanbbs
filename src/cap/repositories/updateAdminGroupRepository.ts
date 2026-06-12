import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateAdminGroupRepository = async (
  { sql, logger }: VakContext,
  params: {
    id: string;
    groupName: string;
    permissions: string;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateAdminGroup",
    id: params.id,
    groupName: params.groupName,
    message: "Updating admin group in database",
  });

  try {
    const result = await sql`
      UPDATE admin_groups
      SET group_name = ${params.groupName}, permissions = ${params.permissions}
      WHERE id = ${params.id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "updateAdminGroup",
        id: params.id,
        message: "Failed to update admin group, no rows affected",
      });
      return err(new DatabaseError("管理者グループの更新に失敗しました"));
    }

    logger.info({
      operation: "updateAdminGroup",
      id: params.id,
      groupName: params.groupName,
      message: "Admin group updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateAdminGroup",
      error,
      id: params.id,
      message: `Database error while updating admin group: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者グループの更新中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
