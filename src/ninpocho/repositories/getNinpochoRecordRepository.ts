import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNinpochoRecord,
  type ReadNinpochoRecord,
} from "../domain/read/ReadNinpochoRecord";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getNinpochoRecordRepository = async (
  { sql, logger }: VakContext,
  params: { hashId?: string; ipAddress?: string }
): Promise<Result<ReadNinpochoRecord | null, DatabaseError>> => {
  logger.debug({
    operation: "getNinpochoRecord",
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    message: "Fetching ninpocho record from database",
  });

  try {
    let rows;

    if (params.hashId) {
      rows = await sql<
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
        SELECT
          id, hash_id, ip_address, error_count, ban_level,
          ban_until, last_error_at, first_seen_at, created_at, xp, gold
        FROM ninpocho_records
        WHERE hash_id = ${params.hashId}
        LIMIT 1
      `;
    } else if (params.ipAddress) {
      rows = await sql<
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
        SELECT
          id, hash_id, ip_address, error_count, ban_level,
          ban_until, last_error_at, first_seen_at, created_at, xp, gold
        FROM ninpocho_records
        WHERE ip_address = ${params.ipAddress}
        LIMIT 1
      `;
    } else {
      return ok(null);
    }

    if (!rows || rows.length === 0) {
      logger.debug({
        operation: "getNinpochoRecord",
        hashId: params.hashId,
        ipAddress: params.ipAddress,
        message: "No ninpocho record found",
      });
      return ok(null);
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
        operation: "getNinpochoRecord",
        error: recordResult.error,
        message: "Failed to create ninpocho record object",
      });
      return err(new DatabaseError("忍法帖記録の取得に失敗しました"));
    }

    logger.info({
      operation: "getNinpochoRecord",
      id: String(r.id),
      hashId: String(r.hash_id),
      message: "Ninpocho record retrieved successfully",
    });

    return ok(recordResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getNinpochoRecord",
      error,
      message: `Database error while fetching ninpocho record: ${message}`,
    });
    return err(
      new DatabaseError(`忍法帖記録取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
