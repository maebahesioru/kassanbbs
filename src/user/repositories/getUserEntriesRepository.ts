import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import { createReadUserEntry } from "../domain/read/ReadUserEntry";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadUserEntry } from "../domain/read/ReadUserEntry";
import type { Result } from "neverthrow";

export const getUserEntriesRepository = async (
  { sql, logger }: VakContext,
  restrictionType?: "deny" | "allow"
): Promise<Result<ReadUserEntry[], DatabaseError>> => {
  logger.debug({
    operation: "getUserEntries",
    restrictionType,
    message: "Fetching user access entries",
  });

  try {
    const rows = restrictionType
      ? await sql`
        SELECT id, ip_or_cidr, restriction_type, note, created_at, host_pattern, ua_pattern, session_id, expires_at, deny_method, ip_range_end, ip_version FROM ip_restrictions
        WHERE restriction_type = ${restrictionType}
        ORDER BY created_at DESC
      `
      : await sql`
        SELECT id, ip_or_cidr, restriction_type, note, created_at, host_pattern, ua_pattern, session_id, expires_at, deny_method, ip_range_end, ip_version FROM ip_restrictions
        ORDER BY created_at DESC
      `;

    if (!rows) {
      logger.error({
        operation: "getUserEntries",
        message: "Failed to retrieve user entries, no result from database",
      });
      return err(new DatabaseError("ユーザーアクセス制限の取得に失敗しました"));
    }

    const entries: ReadUserEntry[] = [];
    for (const r of rows) {
      entries.push(createReadUserEntry({
        id: String(r.id),
        ip_or_cidr: String(r.ip_or_cidr),
        restriction_type: String(r.restriction_type),
        note: String(r.note || ""),
        created_at: new Date(r.created_at),
        host_pattern: r.host_pattern ?? null,
        ua_pattern: r.ua_pattern ?? null,
        session_id: r.session_id ?? null,
        expires_at: r.expires_at ?? null,
        deny_method: r.deny_method ?? null,
        ip_range_end: r.ip_range_end ?? null,
        ip_version: r.ip_version ?? null,
      }));
    }

    logger.info({
      operation: "getUserEntries",
      count: entries.length,
      message: "User access entries retrieved successfully",
    });

    return ok(entries);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getUserEntries",
      error,
      message: msg,
    });
    return err(new DatabaseError(`ユーザーアクセス制限の取得に失敗: ${msg}`, error));
  }
};
