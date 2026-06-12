import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const setUserGroupsRepository = async (
  { sql, logger }: VakContext,
  params: {
    userId: string;
    groupIds: string[];
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "setUserGroups",
    userId: params.userId,
    groupIds: params.groupIds,
    message: "Setting user groups in database",
  });

  try {
    await sql`
      DELETE FROM admin_user_groups WHERE user_id = ${params.userId}::uuid
    `;

    if (params.groupIds.length > 0) {
      const values = params.groupIds.map((groupId) => ({
        user_id: params.userId,
        group_id: groupId,
      }));
      await sql`
        INSERT INTO admin_user_groups ${sql(values, "user_id", "group_id")}
      `;
    }

    logger.info({
      operation: "setUserGroups",
      userId: params.userId,
      groupCount: params.groupIds.length,
      message: "User groups set successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "setUserGroups",
      error,
      userId: params.userId,
      message: `Database error while setting user groups: ${message}`,
    });
    return err(
      new DatabaseError(
        `ユーザーグループの設定中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
