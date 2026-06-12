import { err, ok } from "neverthrow";

import { DatabaseError, ValidationError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteAdminUserRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError | ValidationError>> => {
  logger.debug({
    operation: "deleteAdminUser",
    id,
    message: "Deleting admin user from database",
  });

  try {
    const superAdminCheck = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM admin_users
      WHERE is_super_admin = true
    `;

    if (superAdminCheck && superAdminCheck.length > 0 && superAdminCheck[0].count <= 1) {
      const targetUser = await sql<{ is_super_admin: boolean }[]>`
        SELECT is_super_admin FROM admin_users WHERE id = ${id}::uuid
      `;

      if (
        targetUser &&
        targetUser.length > 0 &&
        targetUser[0].is_super_admin
      ) {
        logger.warn({
          operation: "deleteAdminUser",
          id,
          message: "Cannot delete the last super admin user",
        });
        return err(
          new ValidationError("最後のスーパー管理者は削除できません")
        );
      }
    }

    const result = await sql`
      DELETE FROM admin_users WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteAdminUser",
        id,
        message: "Failed to delete admin user, no rows affected",
      });
      return err(new DatabaseError("管理者ユーザーの削除に失敗しました"));
    }

    logger.info({
      operation: "deleteAdminUser",
      id,
      message: "Admin user deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteAdminUser",
      error,
      id,
      message: `Database error while deleting admin user: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者ユーザーの削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
