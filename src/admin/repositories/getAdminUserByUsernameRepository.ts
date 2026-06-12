import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type AdminUserWithPassword = {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  isSuperAdmin: boolean;
};

export const getAdminUserByUsernameRepository = async (
  { sql, logger }: VakContext,
  username: string
): Promise<
  Result<AdminUserWithPassword | null, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getAdminUserByUsername",
    username,
    message: "Fetching admin user by username from database",
  });

  try {
    const rows = await sql<{
      id: string;
      username: string;
      password_hash: string;
      full_name: string;
      is_super_admin: boolean;
    }[]>`
      SELECT id, username, password_hash, full_name, is_super_admin
      FROM admin_users
      WHERE username = ${username}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      logger.debug({
        operation: "getAdminUserByUsername",
        username,
        message: "No admin user found with this username",
      });
      return ok(null);
    }

    const r = rows[0];

    logger.info({
      operation: "getAdminUserByUsername",
      username,
      message: "Admin user retrieved successfully",
    });

    return ok({
      id: String(r.id),
      username: String(r.username),
      passwordHash: String(r.password_hash),
      fullName: String(r.full_name || ""),
      isSuperAdmin: Boolean(r.is_super_admin),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getAdminUserByUsername",
      error,
      username,
      message: `Database error while retrieving admin user: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者ユーザー取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
