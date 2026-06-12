import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNinpochoRecord,
  type ReadNinpochoRecord,
} from "../domain/read/ReadNinpochoRecord";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getNinpochoRecordsRepository = async ({
  sql,
  logger,
}: VakContext, limit?: number): Promise<Result<ReadNinpochoRecord[], DatabaseError>> => {
  logger.debug({
    operation: "getNinpochoRecords",
    message: "Fetching all ninpocho records from database",
  });

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
      SELECT
        id, hash_id, ip_address, error_count, ban_level,
        ban_until, last_error_at, first_seen_at, created_at, xp, gold
      FROM ninpocho_records
      ORDER BY created_at DESC
      LIMIT ${limit ?? 100}
    `;

    if (!rows) {
      logger.error({
        operation: "getNinpochoRecords",
        message: "Failed to retrieve ninpocho records, no result from database",
      });
      return err(new DatabaseError("忍法帖記録の取得に失敗しました"));
    }

    const records: ReadNinpochoRecord[] = [];
    for (const r of rows) {
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
      if (recordResult.isOk()) {
        records.push(recordResult.value);
      }
    }

    logger.info({
      operation: "getNinpochoRecords",
      count: records.length,
      message: "Ninpocho records retrieved successfully",
    });

    return ok(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getNinpochoRecords",
      error,
      message: `Database error while fetching ninpocho records: ${message}`,
    });
    return err(
      new DatabaseError(`忍法帖記録取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
