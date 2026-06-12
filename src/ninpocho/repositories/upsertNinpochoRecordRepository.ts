import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNinpochoRecord,
  type ReadNinpochoRecord,
} from "../domain/read/ReadNinpochoRecord";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const upsertNinpochoRecordRepository = async (
  { sql, logger }: VakContext,
  params: {
    id: string | null;
    hashId: string;
    ipAddress: string;
    errorCount: number;
    banLevel: number;
    banUntil: Date | null;
    xp?: number;
    gold?: number;
  }
): Promise<Result<ReadNinpochoRecord, DatabaseError>> => {
  logger.debug({
    operation: "upsertNinpochoRecord",
    hashId: params.hashId,
    errorCount: params.errorCount,
    banLevel: params.banLevel,
    message: "Upserting ninpocho record in database",
  });

  const now = new Date();
  const id = params.id ?? uuidv7();

  try {
    const rows = await sql<
      {
        id: string;
        hash_id: string;
        ip_address: string;
        error_count: number;
        ban_level: number;
        ban_until: Date | null;
        last_error_at: Date | null;
        first_seen_at: Date;
        created_at: Date;
        xp: number;
        gold: number;
      }[]
    >`
      INSERT INTO ninpocho_records(
        id, hash_id, ip_address, error_count, ban_level, ban_until,
        last_error_at, first_seen_at, created_at, xp, gold
      )
      VALUES(
        ${id}::uuid,
        ${params.hashId},
        ${params.ipAddress},
        ${params.errorCount},
        ${params.banLevel},
        ${params.banUntil ? params.banUntil.toISOString() : null}::timestamptz,
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz,
        ${params.xp ?? 0},
        ${params.gold ?? 0}
      )
      ON CONFLICT (id) DO UPDATE SET
        hash_id = EXCLUDED.hash_id,
        ip_address = EXCLUDED.ip_address,
        error_count = EXCLUDED.error_count,
        ban_level = EXCLUDED.ban_level,
        ban_until = EXCLUDED.ban_until,
        last_error_at = EXCLUDED.last_error_at,
        xp = EXCLUDED.xp,
        gold = EXCLUDED.gold
      RETURNING
        id, hash_id, ip_address, error_count, ban_level,
        ban_until, last_error_at, first_seen_at, created_at, xp, gold
    `;

    if (!rows || rows.length !== 1) {
      logger.error({
        operation: "upsertNinpochoRecord",
        hashId: params.hashId,
        message: "Failed to upsert ninpocho record, invalid database response",
      });
      return err(new DatabaseError("忍法帖記録の保存に失敗しました"));
    }

    const r = rows[0];

    const recordResult = createReadNinpochoRecord({
      id: String(r.id),
      hashId: String(r.hash_id),
      ipAddress: String(r.ip_address),
      errorCount: Number(r.error_count),
      banLevel: Number(r.ban_level),
      banUntil: r.ban_until ? new Date(r.ban_until) : null,
      lastErrorAt: r.last_error_at ? new Date(r.last_error_at) : null,
      firstSeenAt: new Date(r.first_seen_at),
      createdAt: new Date(r.created_at),
      xp: Number(r.xp),
      gold: Number(r.gold),
    });

    if (recordResult.isErr()) {
      logger.error({
        operation: "upsertNinpochoRecord",
        error: recordResult.error,
        message: "Failed to create ninpocho record object",
      });
      return err(new DatabaseError("忍法帖記録の保存に失敗しました"));
    }

    logger.info({
      operation: "upsertNinpochoRecord",
      id: String(r.id),
      hashId: params.hashId,
      errorCount: params.errorCount,
      banLevel: params.banLevel,
      message: "Ninpocho record upserted successfully",
    });

    return ok(recordResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "upsertNinpochoRecord",
      error,
      hashId: params.hashId,
      message: `Database error while upserting ninpocho record: ${message}`,
    });
    return err(
      new DatabaseError(`忍法帖記録保存中にエラーが発生しました: ${message}`, error)
    );
  }
};
