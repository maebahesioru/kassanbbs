import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import { buildBitmask } from "../services/permissionService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type AdminGroup = {
  id: string;
  groupName: string;
  permissions: string;
  permissionBitmask: number;
  createdAt: Date;
};

export const getAdminGroupsRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<AdminGroup[], DatabaseError>> => {
  logger.debug({
    operation: "getAdminGroups",
    message: "Fetching admin groups from database",
  });

  try {
    const rows = await sql<{
      id: string;
      group_name: string;
      permissions: string;
      created_at: Date;
    }[]>`
      SELECT id, group_name, permissions, created_at
      FROM admin_groups
      ORDER BY created_at
    `;

    if (!rows) {
      logger.error({
        operation: "getAdminGroups",
        message: "Failed to retrieve admin groups, no result from database",
      });
      return err(new DatabaseError("管理者グループの取得に失敗しました"));
    }

    const groups: AdminGroup[] = [];
    for (const r of rows) {
      const permStr = String(r.permissions || "");
      const permNames = permStr
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      groups.push({
        id: String(r.id),
        groupName: String(r.group_name),
        permissions: permStr,
        permissionBitmask: buildBitmask(permNames),
        createdAt: new Date(r.created_at),
      });
    }

    logger.info({
      operation: "getAdminGroups",
      count: groups.length,
      message: "Admin groups retrieved successfully",
    });

    return ok(groups);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getAdminGroups",
      error,
      message: `Database error while retrieving admin groups: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者グループの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
