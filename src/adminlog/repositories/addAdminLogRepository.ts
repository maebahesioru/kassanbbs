import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import { VAK_VERSION } from "../../shared/version";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type AdminLogType =
  | "ADMIN"
  | "ERR"
  | "THR"
  | "WRT"
  | "FLR"
  | "HST"
  | "SMB"
  | "SBH";

export const addAdminLogRepository = async (
  { sql, logger }: VakContext,
  params: {
    action: string;
    detail: string;
    ipAddress: string;
    logType?: AdminLogType;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "addAdminLog",
    action: params.action,
    message: "Adding admin log entry to database",
  });

  const id = uuidv7();
  const logType = params.logType ?? "ADMIN";

  try {
    const result = await sql`
      INSERT INTO admin_logs(id, action, detail, ip_address, log_type, version)
      VALUES(${id}::uuid, ${params.action}, ${params.detail}, ${params.ipAddress}, ${logType}, ${VAK_VERSION})
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addAdminLog",
        params,
        message: "Failed to add admin log, invalid database response",
      });
      return err(new DatabaseError("管理者ログの追加に失敗しました"));
    }

    logger.info({
      operation: "addAdminLog",
      id,
      action: params.action,
      message: "Admin log entry added successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addAdminLog",
      error,
      params,
      message: `Database error while adding admin log: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者ログの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
