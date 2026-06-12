import { err, ok } from "neverthrow";

import { getNinpochoConfigRepository } from "../repositories/getNinpochoConfigRepository";
import { getNinpochoRecordRepository } from "../repositories/getNinpochoRecordRepository";
import { upsertNinpochoRecordRepository } from "../repositories/upsertNinpochoRecordRepository";
import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const recordNinpochoViolationUsecase = async (
  vakContext: VakContext,
  params: { hashId: string; ipAddress: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "recordNinpochoViolation",
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    message: "Recording ninpocho violation",
  });

  const configResult = await getNinpochoConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "recordNinpochoViolation",
      error: configResult.error,
      message: "Failed to fetch ninpocho configuration",
    });
    return err(configResult.error);
  }

  const config = configResult.value.val;

  if (!config.enabled) {
    logger.info({
      operation: "recordNinpochoViolation",
      message: "Ninpocho is disabled, skipping violation recording",
    });
    return ok(undefined);
  }

  const recordResult = await getNinpochoRecordRepository(vakContext, {
    hashId: params.hashId,
  });

  if (recordResult.isErr()) {
    logger.error({
      operation: "recordNinpochoViolation",
      error: recordResult.error,
      message: "Failed to fetch ninpocho record",
    });
    return err(recordResult.error);
  }

  const existingRecord = recordResult.value;

  let recordId: string | null = null;
  let errorCount = 1;

  if (existingRecord) {
    recordId = existingRecord.val.id;
    errorCount = existingRecord.val.errorCount + 1;

    const now = new Date();

    if (existingRecord.val.lastErrorAt) {
      const hoursSinceLastError =
        (now.getTime() - existingRecord.val.lastErrorAt.getTime()) /
        (1000 * 60 * 60);

      if (hoursSinceLastError > config.errorDecayHours) {
        const decayAmount = Math.floor(
          hoursSinceLastError / config.errorDecayHours
        );
        errorCount = Math.max(1, errorCount - decayAmount);
        logger.debug({
          operation: "recordNinpochoViolation",
          hoursSinceLastError,
          decayAmount,
          adjustedErrorCount: errorCount,
          message: "Applied error decay",
        });
      }
    }
  }

  let banLevel = 0;
  let banDurationHours = 0;

  if (errorCount >= config.permanentBanThreshold) {
    banLevel = 4;
    banDurationHours = 876000;
  } else if (errorCount >= config.errorThreshold3) {
    banLevel = 3;
    banDurationHours = config.banDuration3Hours;
  } else if (errorCount >= config.errorThreshold2) {
    banLevel = 2;
    banDurationHours = config.banDuration2Hours;
  } else if (errorCount >= config.errorThreshold1) {
    banLevel = 1;
    banDurationHours = config.banDuration1Hours;
  }

  let banUntil: Date | null = null;
  if (banLevel > 0) {
    banUntil = new Date(Date.now() + banDurationHours * 60 * 60 * 1000);
  }

  logger.info({
    operation: "recordNinpochoViolation",
    hashId: params.hashId,
    errorCount,
    banLevel,
    banDurationHours,
    banUntil: banUntil?.toISOString() ?? null,
    message: "Computed ninpocho penalty",
  });

  const upsertResult = await upsertNinpochoRecordRepository(vakContext, {
    id: recordId,
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    errorCount,
    banLevel,
    banUntil,
  });

  if (upsertResult.isErr()) {
    logger.error({
      operation: "recordNinpochoViolation",
      error: upsertResult.error,
      message: "Failed to upsert ninpocho record",
    });
    return err(upsertResult.error);
  }

  if (banLevel > 0) {
    await addAdminLogRepository(vakContext, {
      action: "\u5FCD\u6CD5\u5E16BAN",
      detail: `hashId: ${params.hashId}, IP: ${params.ipAddress}, banLevel: ${banLevel}, banDuration: ${banDurationHours}h`,
      ipAddress: params.ipAddress,
      logType: "SBH",
    });
  }

  logger.info({
    operation: "recordNinpochoViolation",
    hashId: params.hashId,
    errorCount,
    banLevel,
    message: "Ninpocho violation recorded successfully",
  });

  return ok(undefined);
};
