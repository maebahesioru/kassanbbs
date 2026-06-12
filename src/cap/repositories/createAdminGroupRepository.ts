import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import { buildBitmask } from "../services/permissionService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";
import type { AdminGroup } from "./getAdminGroupsRepository";

export const createAdminGroupRepository = async (
  { sql, logger }: VakContext,
  params: {
    groupName: string;
    permissions: string;
  }
): Promise<Result<AdminGroup, DatabaseError>> => {
  logger.debug({
    operation: "createAdminGroup",
    groupName: params.groupName,
    message: "Creating new admin group in database",
  });

  const id = uuidv7();

  try {
    const result = await sql<{
      id: string;
      group_name: string;
      permissions: string;
      created_at: Date;
    }[]>`
      INSERT INTO admin_groups(id, group_name, permissions)
      VALUES(${id}::uuid, ${params.groupName}, ${params.permissions})
      RETURNING id, group_name, permissions, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "createAdminGroup",
        groupName: params.groupName,
        message: "Failed to create admin group, invalid database response",
      });
      return err(new DatabaseError("管理者グループの作成に失敗しました"));
    }

    const r = result[0];

    logger.info({
      operation: "createAdminGroup",
      id,
      groupName: params.groupName,
      message: "Admin group created successfully",
    });

    const permStr = String(r.permissions || "");
    const permNames = permStr
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return ok({
      id: String(r.id),
      groupName: String(r.group_name),
      permissions: permStr,
      permissionBitmask: buildBitmask(permNames),
      createdAt: new Date(r.created_at),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "createAdminGroup",
      error,
      groupName: params.groupName,
      message: `Database error while creating admin group: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者グループの作成中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
