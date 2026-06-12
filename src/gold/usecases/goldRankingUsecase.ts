import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type GoldRankingEntry = {
  hashId: string;
  gold: number;
  rank: number;
};

export const getGoldRankingUsecase = async (
  { sql, logger }: VakContext,
  { limit = 50 }: { limit?: number }
): Promise<Result<GoldRankingEntry[], Error>> => {
  logger.debug({ operation: "getGoldRanking", limit, message: "Fetching gold ranking" });
  try {
    const rows = await sql<{ hash_id: string; gold: number; rank: number }[]>`
      SELECT hash_id, gold, ROW_NUMBER() OVER (ORDER BY gold DESC) as rank
      FROM ninpocho_records
      WHERE gold > 0
      ORDER BY gold DESC
      LIMIT ${limit}
    `;
    return ok((rows || []).map((r) => ({
      hashId: String(r.hash_id),
      gold: Number(r.gold),
      rank: Number(r.rank),
    })));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "getGoldRanking", error, message: msg });
    return err(new DatabaseError(`ゴールドランキング取得に失敗: ${msg}`, error));
  }
};
