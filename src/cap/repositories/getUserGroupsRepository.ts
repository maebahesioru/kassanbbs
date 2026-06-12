import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type UserGroup = {
  userId: string;
  groupId: string;
};

export const getUserGroupsRepository = async (
  { sql, logger }: VakContext,
  userId: string
): Promise<Result<UserGroup[], DatabaseError>> => {
  logger.debug({
    operation: "getUserGroups",
    userId,
    message: "Fetching user groups from database",
  });

  try {
    const rows = await sql<{
      user_id: string;
      group_id: string;
    }[]>`
      SELECT user_id, group_id
      FROM admin_user_groups
      WHERE user_id = ${userId}::uuid
    `;

    if (!rows) {
      logger.error({
        operation: "getUserGroups",
        userId,
        message: "Failed to retrieve user groups, no result from database",
      });
      return err(new DatabaseError("ユーザーグループの取得に失敗しました"));
    }

    const groups: UserGroup[] = [];
    for (const r of rows) {
      groups.push({
        userId: String(r.user_id),
        groupId: String(r.group_id),
      });
    }

    logger.info({
      operation: "getUserGroups",
      userId,
      count: groups.length,
      message: "User groups retrieved successfully",
    });

    return ok(groups);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getUserGroups",
      error,
      userId,
      message: `Database error while retrieving user groups: ${message}`,
    });
    return err(
      new DatabaseError(
        `ユーザーグループの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
