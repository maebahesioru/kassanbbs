import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadSambaTracking,
  type ReadSambaTracking,
} from "../domain/read/ReadSambaTracking";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getSambaTrackingRecordsRepository = async ({
  sql,
  logger,
}: VakContext, limit?: number): Promise<Result<ReadSambaTracking[], DatabaseError>> => {
  logger.debug({
    operation: "getSambaTrackingRecords",
    message: "Fetching all samba tracking records from database",
  });

  try {
    const rows = await sql<
      {
        id: string;
        host_identifier: string;
        violation_count: number;
        current_level: string;
        last_violation_at: Date | null;
        ban_until: Date | null;
        created_at: Date;
      }[]
    >`
      SELECT
        id, host_identifier, violation_count, current_level,
        last_violation_at, ban_until, created_at
      FROM samba_tracking
      ORDER BY created_at DESC
      LIMIT ${limit ?? 100}
    `;

    if (!rows) {
      logger.error({
        operation: "getSambaTrackingRecords",
        message: "Failed to retrieve samba tracking records, no result from database",
      });
      return err(new DatabaseError("サンバ追跡記録の取得に失敗しました"));
    }

    const records: ReadSambaTracking[] = [];
    for (const r of rows) {
      const recordResult = createReadSambaTracking({
        id: String(r.id),
        hostIdentifier: String(r.host_identifier),
        violationCount: Number(r.violation_count),
        currentLevel: r.current_level as
          | "none"
          | "caution"
          | "warning"
          | "listed"
          | "banned",
        lastViolationAt: r.last_violation_at
          ? new Date(r.last_violation_at)
          : null,
        banUntil: r.ban_until ? new Date(r.ban_until) : null,
        createdAt: new Date(r.created_at),
      });
      if (recordResult.isOk()) {
        records.push(recordResult.value);
      }
    }

    logger.info({
      operation: "getSambaTrackingRecords",
      count: records.length,
      message: "Samba tracking records retrieved successfully",
    });

    return ok(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getSambaTrackingRecords",
      error,
      message: `Database error while fetching samba tracking records: ${message}`,
    });
    return err(
      new DatabaseError(`サンバ追跡記録取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
