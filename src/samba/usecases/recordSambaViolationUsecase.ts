import { err, ok } from "neverthrow";

import { getSambaConfigRepository } from "../repositories/getSambaConfigRepository";
import { getSambaTrackingRepository } from "../repositories/getSambaTrackingRepository";
import { upsertSambaTrackingRepository } from "../repositories/upsertSambaTrackingRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const recordSambaViolationUsecase = async (
  vakContext: VakContext,
  params: { hostIdentifier: string; isLiveMode: boolean }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "recordSambaViolation",
    hostIdentifier: params.hostIdentifier,
    isLiveMode: params.isLiveMode,
    message: "Recording samba violation",
  });

  const configResult = await getSambaConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "recordSambaViolation",
      error: configResult.error,
      message: "Failed to fetch samba configuration",
    });
    return err(configResult.error);
  }

  const config = configResult.value.val;

  if (!config.enabled) {
    logger.info({
      operation: "recordSambaViolation",
      message: "Samba is disabled, skipping violation recording",
    });
    return ok(undefined);
  }

  const existingResult = await getSambaTrackingRepository(
    vakContext,
    params.hostIdentifier
  );

  if (existingResult.isErr()) {
    logger.error({
      operation: "recordSambaViolation",
      error: existingResult.error,
      message: "Failed to fetch existing samba tracking record",
    });
    return err(existingResult.error);
  }

  let recordId: string | null = null;
  let violationCount = 1;

  const existing = existingResult.value;
  if (existing) {
    recordId = existing.val.id;
    violationCount = existing.val.violationCount + 1;

    const now = new Date();

    if (existing.val.lastViolationAt) {
      const hoursSinceLastViolation =
        (now.getTime() - existing.val.lastViolationAt.getTime()) /
        (1000 * 60 * 60);

      if (hoursSinceLastViolation > config.violationDecayHours) {
        const decayAmount = Math.floor(
          hoursSinceLastViolation / config.violationDecayHours
        );
        violationCount = Math.max(1, violationCount - decayAmount);
        logger.debug({
          operation: "recordSambaViolation",
          hoursSinceLastViolation,
          decayAmount,
          adjustedViolationCount: violationCount,
          message: "Applied violation decay",
        });
      }
    }
  }

  let currentLevel = "none";
  let banUntil: Date | null = null;

  if (violationCount >= config.listedThreshold) {
    currentLevel = "banned";
    const multiplier = params.isLiveMode ? config.liveModeMultiplier : 1;
    const durationHours = config.banDurationHours * multiplier;
    banUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  } else if (violationCount >= config.warningThreshold) {
    currentLevel = "listed";
    const multiplier = params.isLiveMode ? config.liveModeMultiplier : 1;
    const durationHours = config.banDurationHours * multiplier;
    banUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  } else if (violationCount >= config.cautionThreshold) {
    currentLevel = "warning";
    const multiplier = params.isLiveMode ? config.liveModeMultiplier : 1;
    const durationHours = config.banDurationHours * multiplier;
    banUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  } else if (violationCount > 0 && violationCount < config.cautionThreshold) {
    currentLevel = "caution";
  }

  logger.info({
    operation: "recordSambaViolation",
    hostIdentifier: params.hostIdentifier,
    violationCount,
    currentLevel,
    banUntil: banUntil?.toISOString() ?? null,
    message: "Computed samba penalty",
  });

  const upsertResult = await upsertSambaTrackingRepository(vakContext, {
    id: recordId,
    hostIdentifier: params.hostIdentifier,
    violationCount,
    currentLevel,
    banUntil,
  });

  if (upsertResult.isErr()) {
    logger.error({
      operation: "recordSambaViolation",
      error: upsertResult.error,
      message: "Failed to upsert samba tracking record",
    });
    return err(upsertResult.error);
  }

  logger.info({
    operation: "recordSambaViolation",
    hostIdentifier: params.hostIdentifier,
    violationCount,
    currentLevel,
    message: "Samba violation recorded successfully",
  });

  return ok(undefined);
};
