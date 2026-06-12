import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadSambaTracking,
  type ReadSambaTracking,
} from "../domain/read/ReadSambaTracking";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const upsertSambaTrackingRepository = async (
  { sql, logger }: VakContext,
  params: {
    id: string | null;
    hostIdentifier: string;
    violationCount: number;
    currentLevel: string;
    banUntil: Date | null;
  }
): Promise<Result<ReadSambaTracking, DatabaseError>> => {
  logger.debug({
    operation: "upsertSambaTracking",
    hostIdentifier: params.hostIdentifier,
    violationCount: params.violationCount,
    currentLevel: params.currentLevel,
    message: "Upserting samba tracking record in database",
  });

  const now = new Date();
  const id = params.id ?? uuidv7();

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
      INSERT INTO samba_tracking(
        id, host_identifier, violation_count, current_level,
        last_violation_at, ban_until, created_at
      )
      VALUES(
        ${id}::uuid,
        ${params.hostIdentifier},
        ${params.violationCount},
        ${params.currentLevel},
        ${now.toISOString()}::timestamptz,
        ${params.banUntil ? params.banUntil.toISOString() : null}::timestamptz,
        ${now.toISOString()}::timestamptz
      )
      ON CONFLICT (host_identifier) DO UPDATE SET
        violation_count = EXCLUDED.violation_count,
        current_level = EXCLUDED.current_level,
        last_violation_at = EXCLUDED.last_violation_at,
        ban_until = EXCLUDED.ban_until
      RETURNING
        id, host_identifier, violation_count, current_level,
        last_violation_at, ban_until, created_at
    `;

    if (!rows || rows.length !== 1) {
      logger.error({
        operation: "upsertSambaTracking",
        hostIdentifier: params.hostIdentifier,
        message: "Failed to upsert samba tracking record, invalid database response",
      });
      return err(new DatabaseError("サンバ追跡記録の保存に失敗しました"));
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
        operation: "upsertSambaTracking",
        error: recordResult.error,
        message: "Failed to create samba tracking object",
      });
      return err(new DatabaseError("サンバ追跡記録の保存に失敗しました"));
    }

    logger.info({
      operation: "upsertSambaTracking",
      id: String(r.id),
      hostIdentifier: params.hostIdentifier,
      violationCount: params.violationCount,
      currentLevel: params.currentLevel,
      message: "Samba tracking record upserted successfully",
    });

    return ok(recordResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "upsertSambaTracking",
      error,
      hostIdentifier: params.hostIdentifier,
      message: `Database error while upserting samba tracking record: ${message}`,
    });
    return err(
      new DatabaseError(`サンバ追跡記録保存中にエラーが発生しました: ${message}`, error)
    );
  }
};
