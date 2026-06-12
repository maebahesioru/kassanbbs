import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const sendGoldUsecase = async (
  vakContext: VakContext,
  params: { fromHashId: string; toHashId: string; amount: number; ipAddress: string }
): Promise<Result<void, Error>> => {
  const { logger, sql } = vakContext;

  if (params.amount <= 0) {
    return err(new ValidationError("送金金額は正の値を指定してください"));
  }

  if (params.fromHashId === params.toHashId) {
    return err(new ValidationError("自分自身に送金することはできません"));
  }

  try {
    await sql.begin(async (sql) => {
      const [sender] = await sql`SELECT gold FROM ninpocho_records WHERE hash_id = ${params.fromHashId} FOR UPDATE`;
      if (!sender || sender.gold < params.amount) throw new Error("Gold insufficient");
      await sql`UPDATE ninpocho_records SET gold = gold - ${params.amount} WHERE hash_id = ${params.fromHashId}`;
      await sql`UPDATE ninpocho_records SET gold = gold + ${params.amount} WHERE hash_id = ${params.toHashId}`;
    });
  } catch (txError) {
    const msg = txError instanceof Error ? txError.message : "Unknown error";
    logger.error({ operation: "sendGold", error: txError, message: `Gold transfer failed: ${msg}` });
    return err(new ValidationError(`送金に失敗しました: ${msg}`));
  }

  await addAdminLogRepository(vakContext, {
    action: "ゴールド送金",
    detail: `from: ${params.fromHashId}, to: ${params.toHashId}, amount: ${params.amount}`,
    ipAddress: params.ipAddress,
    logType: "ADMIN",
  });

  logger.info({
    operation: "sendGold",
    from: params.fromHashId,
    to: params.toHashId,
    amount: params.amount,
    message: "Gold transfer completed",
  });

  return ok(undefined);
};

export const throwGoldUsecase = async (
  vakContext: VakContext,
  params: { fromHashId: string; toHashId: string; amount: number; threadId: string; ipAddress: string }
): Promise<Result<void, Error>> => {
  const { logger, sql } = vakContext;

  if (params.amount <= 0) {
    return err(new ValidationError("投げ銭金額は正の値を指定してください"));
  }

  try {
    await sql.begin(async (sql) => {
      const [sender] = await sql`SELECT gold FROM ninpocho_records WHERE hash_id = ${params.fromHashId} FOR UPDATE`;
      if (!sender || sender.gold < params.amount) throw new Error("Gold insufficient");
      await sql`UPDATE ninpocho_records SET gold = gold - ${params.amount} WHERE hash_id = ${params.fromHashId}`;
      await sql`UPDATE ninpocho_records SET gold = gold + ${params.amount} WHERE hash_id = ${params.toHashId}`;
    });
  } catch (txError) {
    const msg = txError instanceof Error ? txError.message : "Unknown error";
    logger.error({ operation: "throwGold", error: txError, message: `Gold throw failed: ${msg}` });
    return err(new ValidationError(`投げ銭に失敗しました: ${msg}`));
  }

  await addAdminLogRepository(vakContext, {
    action: "ゴールド投げ銭",
    detail: `from: ${params.fromHashId}, to: ${params.toHashId}, amount: ${params.amount}, thread: ${params.threadId}`,
    ipAddress: params.ipAddress,
    logType: "ADMIN",
  });

  logger.info({
    operation: "throwGold",
    from: params.fromHashId,
    to: params.toHashId,
    amount: params.amount,
    message: "Gold throw completed",
  });

  return ok(undefined);
};
