import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type FailureLog = {
  id: string;
  action: string;
  detail: string;
  ipAddress: string;
  logType: string;
  createdAt: Date;
};

export const getFailureLogsRepository = async (
  { sql, logger }: VakContext
): Promise<Result<FailureLog[], DatabaseError>> => {
  logger.debug({ operation: "getFailureLogs", message: "Fetching failure logs from database" });
  try {
    const rows = await sql`
      SELECT id, action, detail, ip_address, log_type, version, created_at FROM admin_logs
      WHERE log_type = 'FLR'
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (!rows) {
      return err(new DatabaseError("障害ログの取得に失敗しました"));
    }

    const logs: FailureLog[] = [];
    for (const r of rows) {
      logs.push({
        id: String(r.id),
        action: String(r.action),
        detail: String(r.detail || ""),
        ipAddress: String(r.ip_address || ""),
        logType: String(r.log_type || "FLR"),
        createdAt: new Date(r.created_at),
      });
    }

    logger.info({ operation: "getFailureLogs", count: logs.length, message: "Failure logs retrieved successfully" });
    return ok(logs);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "getFailureLogs", error, message: msg });
    return err(new DatabaseError(`障害ログの取得中にエラーが発生しました: ${msg}`, error));
  }
};