import { err, ok } from "neverthrow";

import { getNinpochoConfigRepository } from "../repositories/getNinpochoConfigRepository";
import { getNinpochoRecordRepository } from "../repositories/getNinpochoRecordRepository";
import { ErrorCodes } from "../../error/completeErrorCodes";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkNinpochoUsecase = async (
  vakContext: VakContext,
  params: { hashId: string; ipAddress: string }
): Promise<Result<{ allowed: boolean; reason?: string; banUntil?: Date }, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkNinpocho",
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    message: "Checking ninpocho ban status",
  });

  const configResult = await getNinpochoConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkNinpocho",
      error: configResult.error,
      message: "Failed to fetch ninpocho configuration",
    });
    return err(configResult.error);
  }

  const config = configResult.value.val;

  if (!config.enabled) {
    logger.info({
      operation: "checkNinpocho",
      message: "Ninpocho is disabled, allowing access",
    });
    return ok({ allowed: true });
  }

  const recordResult = await getNinpochoRecordRepository(vakContext, {
    hashId: params.hashId,
  });

  if (recordResult.isErr()) {
    logger.error({
      operation: "checkNinpocho",
      error: recordResult.error,
      message: "Failed to fetch ninpocho record by hash_id",
    });
    return err(recordResult.error);
  }

  const record = recordResult.value;

  if (record) {
    const now = new Date();
    if (record.val.banUntil && record.val.banUntil > now) {
      const remainingMinutes = Math.ceil(
        (record.val.banUntil.getTime() - now.getTime()) / 60000
      );
      logger.warn({
        operation: "checkNinpocho",
        hashId: params.hashId,
        banLevel: record.val.banLevel,
        banUntil: record.val.banUntil.toISOString(),
        remainingMinutes,
        message: "User is currently banned by hash_id",
      });

      const isPermanent = record.val.banLevel >= 4;

      return ok({
        allowed: false,
        reason: isPermanent
          ? `[${ErrorCodes.BANNED.code}] ${ErrorCodes.BANNED.msg}`
          : `アクセス禁止中です（残り${remainingMinutes}分）`,
        banUntil: record.val.banUntil,
      });
    }
  }

  const ipRecordResult = await getNinpochoRecordRepository(vakContext, {
    ipAddress: params.ipAddress,
  });

  if (ipRecordResult.isErr()) {
    logger.error({
      operation: "checkNinpocho",
      error: ipRecordResult.error,
      message: "Failed to fetch ninpocho record by IP",
    });
    return err(ipRecordResult.error);
  }

  const ipRecord = ipRecordResult.value;

  if (ipRecord) {
    const now = new Date();
    if (ipRecord.val.banUntil && ipRecord.val.banUntil > now) {
      logger.warn({
        operation: "checkNinpocho",
        ipAddress: params.ipAddress,
        banLevel: ipRecord.val.banLevel,
        banUntil: ipRecord.val.banUntil.toISOString(),
        message: "User is currently banned by IP address",
      });

      const isPermanent = ipRecord.val.banLevel >= 4;

      return ok({
        allowed: false,
        reason: isPermanent
          ? `[${ErrorCodes.BANNED.code}] ${ErrorCodes.BANNED.msg}`
          : "アクセス禁止中です",
        banUntil: ipRecord.val.banUntil,
      });
    }
  }

  logger.info({
    operation: "checkNinpocho",
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    message: "User is not banned, allowing access",
  });

  return ok({ allowed: true });
};
