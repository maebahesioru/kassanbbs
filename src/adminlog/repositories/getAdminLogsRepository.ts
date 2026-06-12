import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { AdminLogType } from "./addAdminLogRepository";
import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type AdminLog = {
  id: string;
  action: string;
  detail: string;
  ipAddress: string;
  logType: string;
  createdAt: Date;
};

export const getAdminLogsRepository = async (
  { sql, logger }: VakContext,
  limit?: number,
  logType?: AdminLogType
): Promise<Result<AdminLog[], DatabaseError>> => {
  logger.debug({
    operation: "getAdminLogs",
    limit,
    logType,
    message: "Fetching admin logs from database",
  });

  try {
    const rows = logType
      ? await sql`
        SELECT id, action, detail, ip_address, log_type, version, created_at FROM admin_logs
        WHERE log_type = ${logType}
        ORDER BY created_at DESC
        LIMIT ${limit ?? 100}
      `
      : limit
        ? await sql`
          SELECT id, action, detail, ip_address, log_type, version, created_at FROM admin_logs
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
        : await sql`
          SELECT id, action, detail, ip_address, log_type, version, created_at FROM admin_logs
          ORDER BY created_at DESC
          LIMIT ${limit ?? 100}
        `;

    if (!rows) {
      logger.error({
        operation: "getAdminLogs",
        message: "Failed to retrieve admin logs, no result from database",
      });
      return err(new DatabaseError("\u7BA1\u7406\u8005\u30ED\u30B0\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
    }

    const logs: AdminLog[] = [];
    for (const r of rows) {
      logs.push({
        id: String(r.id),
        action: String(r.action),
        detail: String(r.detail || ""),
        ipAddress: String(r.ip_address || ""),
        logType: String(r.log_type || "ADMIN"),
        createdAt: new Date(r.created_at),
      });
    }

    logger.info({
      operation: "getAdminLogs",
      count: logs.length,
      message: "Admin logs retrieved successfully",
    });

    return ok(logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getAdminLogs",
      error,
      message: `Database error while retrieving admin logs: ${message}`,
    });
    return err(
      new DatabaseError(
        `管理者ログの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
