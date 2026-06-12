import { hash } from "bcrypt-ts";
import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";
import type { AdminUser } from "./getAdminUsersRepository";

export const createAdminUserRepository = async (
  { sql, logger }: VakContext,
  params: {
    username: string;
    password: string;
    fullName: string;
    isSuperAdmin: boolean;
  }
): Promise<Result<AdminUser, DatabaseError>> => {
  logger.debug({
    operation: "createAdminUser",
    username: params.username,
    message: "Creating new admin user in database",
  });

  const id = uuidv7();

  try {
    const passwordHash = await hash(params.password, 10);

    const result = await sql<{
      id: string;
      username: string;
      full_name: string;
      is_super_admin: boolean;
      created_at: Date;
    }[]>`
      INSERT INTO admin_users(id, username, password_hash, full_name, is_super_admin)
      VALUES(${id}::uuid, ${params.username}, ${passwordHash}, ${params.fullName}, ${params.isSuperAdmin})
      RETURNING id, username, full_name, is_super_admin, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "createAdminUser",
        username: params.username,
        message: "Failed to create admin user, invalid database response",
      });
      return err(new DatabaseError("管理者ユーザーの作成に失敗しました"));
    }

    const r = result[0];

    logger.info({
      operation: "createAdminUser",
      id,
      username: params.username,
      message: "Admin user created successfully",
    });

    return ok({
      id: String(r.id),
      username: String(r.username),
      fullName: String(r.full_name || ""),
      isSuperAdmin: Boolean(r.is_super_admin),
      createdAt: new Date(r.created_at),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "createAdminUser",
      error,
      username: params.username,
      message: `Database error while creating admin user: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者ユーザーの作成中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
