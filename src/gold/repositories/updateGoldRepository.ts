import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addGoldRepository = async (
  { sql, logger }: VakContext,
  { hashId, amount }: { hashId: string; amount: number }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "addGold", hashId, amount, message: "Adding gold to user" });
  try {
    const result = await sql`
      UPDATE ninpocho_records SET gold = gold + ${amount} WHERE hash_id = ${hashId} RETURNING id
    `;
    if (!result || result.length === 0) {
      return err(new DatabaseError(`ユーザー ${hashId} のゴールド更新に失敗しました`));
    }
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "addGold", error, message: msg });
    return err(new DatabaseError(`ゴールド追加に失敗: ${msg}`, error));
  }
};

export const deductGoldRepository = async (
  { sql, logger }: VakContext,
  { hashId, amount }: { hashId: string; amount: number }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "deductGold", hashId, amount, message: "Deducting gold from user" });
  try {
    const result = await sql`
      UPDATE ninpocho_records SET gold = gold - ${amount} WHERE hash_id = ${hashId} AND gold >= ${amount} RETURNING id
    `;
    if (!result || result.length === 0) {
      return err(new DatabaseError(`残高不足またはユーザーが見つかりません`));
    }
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "deductGold", error, message: msg });
    return err(new DatabaseError(`ゴールド減算に失敗: ${msg}`, error));
  }
};
