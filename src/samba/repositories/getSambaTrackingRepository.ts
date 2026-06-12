import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadSambaTracking,
  type ReadSambaTracking,
} from "../domain/read/ReadSambaTracking";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getSambaTrackingRepository = async (
  { sql, logger }: VakContext,
  hostIdentifier: string
): Promise<Result<ReadSambaTracking | null, DatabaseError>> => {
  logger.debug({
    operation: "getSambaTracking",
    hostIdentifier,
    message: "Fetching samba tracking record from database",
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
      WHERE host_identifier = ${hostIdentifier}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      logger.debug({
        operation: "getSambaTracking",
        hostIdentifier,
        message: "No samba tracking record found",
      });
      return ok(null);
    }

    const r = rows[0];

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

    if (recordResult.isErr()) {
      logger.error({
        operation: "getSambaTracking",
        error: recordResult.error,
        message: "Failed to create samba tracking object",
      });
      return err(new DatabaseError("サンバ追跡記録の取得に失敗しました"));
    }

    logger.info({
      operation: "getSambaTracking",
      id: String(r.id),
      hostIdentifier: String(r.host_identifier),
      message: "Samba tracking record retrieved successfully",
    });

    return ok(recordResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getSambaTracking",
      error,
      hostIdentifier,
      message: `Database error while fetching samba tracking record: ${message}`,
    });
    return err(
      new DatabaseError(`サンバ追跡記録取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
