import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type AdminUser = {
  id: string;
  username: string;
  fullName: string;
  isSuperAdmin: boolean;
  createdAt: Date;
};

export const getAdminUsersRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<AdminUser[], DatabaseError>> => {
  logger.debug({
    operation: "getAdminUsers",
    message: "Fetching admin users from database",
  });

  try {
    const rows = await sql<{
      id: string;
      username: string;
      full_name: string;
      is_super_admin: boolean;
      created_at: Date;
    }[]>`
      SELECT id, username, full_name, is_super_admin, created_at
      FROM admin_users
      ORDER BY created_at
    `;

    if (!rows) {
      logger.error({
        operation: "getAdminUsers",
        message: "Failed to retrieve admin users, no result from database",
      });
      return err(new DatabaseError("管理者ユーザーの取得に失敗しました"));
    }

    const users: AdminUser[] = [];
    for (const r of rows) {
      users.push({
        id: String(r.id),
        username: String(r.username),
        fullName: String(r.full_name || ""),
        isSuperAdmin: Boolean(r.is_super_admin),
        createdAt: new Date(r.created_at),
      });
    }

    logger.info({
      operation: "getAdminUsers",
      count: users.length,
      message: "Admin users retrieved successfully",
    });

    return ok(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getAdminUsers",
      error,
      message: `Database error while retrieving admin users: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者ユーザーの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
