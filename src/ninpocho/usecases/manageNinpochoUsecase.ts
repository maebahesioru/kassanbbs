import { err, ok } from "neverthrow";

import { upsertNinpochoRecordRepository } from "../repositories/upsertNinpochoRecordRepository";
import { getNinpochoRecordsRepository } from "../repositories/getNinpochoRecordsRepository";
import { getNinpochoRecordRepository } from "../repositories/getNinpochoRecordRepository";
import { getNinpochoConfigRepository } from "../repositories/getNinpochoConfigRepository";
import { updateNinpochoConfigRepository } from "../repositories/updateNinpochoConfigRepository";
import { deleteNinpochoRecordRepository } from "../repositories/deleteNinpochoRecordRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadNinpochoRecord } from "../domain/read/ReadNinpochoRecord";
import type { ReadNinpochoConfig } from "../domain/read/ReadNinpochoConfig";
import type { Result } from "neverthrow";

export const getNinpochoRecordsUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadNinpochoRecord[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getNinpochoRecords",
    message: "Retrieving all ninpocho records",
  });

  const result = await getNinpochoRecordsRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getNinpochoRecords",
      error: result.error,
      message: "Failed to retrieve ninpocho records",
    });
    return result;
  }

  logger.info({
    operation: "getNinpochoRecords",
    count: result.value.length,
    message: "Ninpocho records retrieved successfully",
  });

  return result;
};

export const getNinpochoConfigUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadNinpochoConfig, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getNinpochoConfig",
    message: "Retrieving ninpocho configuration",
  });

  const result = await getNinpochoConfigRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getNinpochoConfig",
      error: result.error,
      message: "Failed to retrieve ninpocho configuration",
    });
    return result;
  }

  logger.info({
    operation: "getNinpochoConfig",
    message: "Ninpocho configuration retrieved successfully",
  });

  return result;
};

export const resetNinpochoRecordUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "resetNinpochoRecord",
    id,
    message: "Resetting ninpocho record",
  });

  const result = await deleteNinpochoRecordRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "resetNinpochoRecord",
      error: result.error,
      id,
      message: "Failed to reset ninpocho record",
    });
    return result;
  }

  logger.info({
    operation: "resetNinpochoRecord",
    id,
    message: "Ninpocho record reset successfully",
  });

  return result;
};

export const banNinpochoUserUsecase = async (
  vakContext: VakContext,
  params: { hashId: string; ipAddress: string; banDurationHours: number }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "banNinpochoUser",
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    banDurationHours: params.banDurationHours,
    message: "Manually banning user via ninpocho",
  });

  const recordResult = await getNinpochoRecordRepository(vakContext, {
    hashId: params.hashId,
  });

  if (recordResult.isErr()) {
    logger.error({
      operation: "banNinpochoUser",
      error: recordResult.error,
      message: "Failed to fetch ninpocho record",
    });
    return err(recordResult.error);
  }

  const existingRecord = recordResult.value;

  const banLevel = params.banDurationHours >= 876000 ? 4 : 3;
  const banUntil = new Date(
    Date.now() + params.banDurationHours * 60 * 60 * 1000
  );

  const upsertResult = await upsertNinpochoRecordRepository(vakContext, {
    id: existingRecord?.val.id ?? null,
    hashId: params.hashId,
    ipAddress: params.ipAddress,
    errorCount: existingRecord?.val.errorCount ?? 0,
    banLevel,
    banUntil,
  });

  if (upsertResult.isErr()) {
    logger.error({
      operation: "banNinpochoUser",
      error: upsertResult.error,
      message: "Failed to ban user via ninpocho",
    });
    return err(upsertResult.error);
  }

  logger.info({
    operation: "banNinpochoUser",
    hashId: params.hashId,
    banLevel,
    banUntil: banUntil.toISOString(),
    message: "User banned successfully via ninpocho",
  });

  return ok(undefined);
};

export const unbanNinpochoUserUsecase = async (
  vakContext: VakContext,
  hashId: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "unbanNinpochoUser",
    hashId,
    message: "Unbanning user via ninpocho",
  });

  const recordResult = await getNinpochoRecordRepository(vakContext, {
    hashId,
  });

  if (recordResult.isErr()) {
    logger.error({
      operation: "unbanNinpochoUser",
      error: recordResult.error,
      message: "Failed to fetch ninpocho record",
    });
    return err(recordResult.error);
  }

  const record = recordResult.value;

  if (!record) {
    logger.warn({
      operation: "unbanNinpochoUser",
      hashId,
      message: "No ninpocho record found for user",
    });
    return ok(undefined);
  }

  const upsertResult = await upsertNinpochoRecordRepository(vakContext, {
    id: record.val.id,
    hashId: record.val.hashId,
    ipAddress: record.val.ipAddress,
    errorCount: record.val.errorCount,
    banLevel: 0,
    banUntil: null,
  });

  if (upsertResult.isErr()) {
    logger.error({
      operation: "unbanNinpochoUser",
      error: upsertResult.error,
      message: "Failed to unban user via ninpocho",
    });
    return err(upsertResult.error);
  }

  logger.info({
    operation: "unbanNinpochoUser",
    hashId,
    message: "User unbanned successfully via ninpocho",
  });

  return ok(undefined);
};

export const updateNinpochoConfigUsecase = async (
  vakContext: VakContext,
  params: {
    enabled?: boolean;
    errorThreshold1?: number;
    banDuration1Hours?: number;
    errorThreshold2?: number;
    banDuration2Hours?: number;
    errorThreshold3?: number;
    banDuration3Hours?: number;
    permanentBanThreshold?: number;
    errorDecayHours?: number;
    forceSageLevel?: number;
    forceKoteName?: string;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateNinpochoConfig",
    message: "Updating ninpocho configuration",
  });

  const result = await updateNinpochoConfigRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "updateNinpochoConfig",
      error: result.error,
      message: "Failed to update ninpocho configuration",
    });
    return result;
  }

  logger.info({
    operation: "updateNinpochoConfig",
    message: "Ninpocho configuration updated successfully",
  });

  return result;
};
