import { err, ok } from "neverthrow";

import { getSambaTrackingRecordsRepository } from "../repositories/getSambaTrackingRecordsRepository";
import { getSambaConfigRepository } from "../repositories/getSambaConfigRepository";
import { deleteSambaTrackingRepository } from "../repositories/deleteSambaTrackingRepository";
import { updateSambaConfigRepository } from "../repositories/updateSambaConfigRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadSambaTracking } from "../domain/read/ReadSambaTracking";
import type { ReadSambaConfig } from "../domain/read/ReadSambaConfig";
import type { Result } from "neverthrow";

export const getSambaRecordsUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadSambaTracking[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getSambaRecords",
    message: "Retrieving all samba tracking records",
  });

  const result = await getSambaTrackingRecordsRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getSambaRecords",
      error: result.error,
      message: "Failed to retrieve samba tracking records",
    });
    return result;
  }

  logger.info({
    operation: "getSambaRecords",
    count: result.value.length,
    message: "Samba tracking records retrieved successfully",
  });

  return result;
};

export const getSambaConfigUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadSambaConfig, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getSambaConfig",
    message: "Retrieving samba configuration",
  });

  const result = await getSambaConfigRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getSambaConfig",
      error: result.error,
      message: "Failed to retrieve samba configuration",
    });
    return result;
  }

  logger.info({
    operation: "getSambaConfig",
    message: "Samba configuration retrieved successfully",
  });

  return result;
};

export const resetSambaRecordUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "resetSambaRecord",
    id,
    message: "Resetting samba tracking record",
  });

  const result = await deleteSambaTrackingRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "resetSambaRecord",
      error: result.error,
      id,
      message: "Failed to reset samba tracking record",
    });
    return result;
  }

  logger.info({
    operation: "resetSambaRecord",
    id,
    message: "Samba tracking record reset successfully",
  });

  return result;
};

export const updateSambaConfigUsecase = async (
  vakContext: VakContext,
  params: {
    enabled?: boolean;
    cautionThreshold?: number;
    warningThreshold?: number;
    listedThreshold?: number;
    banDurationHours?: number;
    liveModeMultiplier?: number;
    violationDecayHours?: number;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateSambaConfig",
    message: "Updating samba configuration",
  });

  const result = await updateSambaConfigRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "updateSambaConfig",
      error: result.error,
      message: "Failed to update samba configuration",
    });
    return result;
  }

  logger.info({
    operation: "updateSambaConfig",
    message: "Samba configuration updated successfully",
  });

  return result;
};
