import { err, ok } from "neverthrow";

import { getSambaConfigRepository } from "../repositories/getSambaConfigRepository";
import { getSambaTrackingRepository } from "../repositories/getSambaTrackingRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

const SAMBA_CODE_CAUTION = 505 as const;
const SAMBA_CODE_WARNING = 506 as const;
const SAMBA_CODE_LISTED = 507 as const;
const SAMBA_CODE_BANNED = 508 as const;

export type SambaCheckResult = {
  allowed: boolean;
  level: string;
  sambaCode:
    | typeof SAMBA_CODE_CAUTION
    | typeof SAMBA_CODE_WARNING
    | typeof SAMBA_CODE_LISTED
    | typeof SAMBA_CODE_BANNED;
  reason: string;
  banUntil?: Date;
};

export const checkSambaUsecase = async (
  vakContext: VakContext,
  params: { hostIdentifier: string; isLiveMode: boolean }
): Promise<Result<SambaCheckResult, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkSamba",
    hostIdentifier: params.hostIdentifier,
    isLiveMode: params.isLiveMode,
    message: "Checking samba tiered regulation status",
  });

  const configResult = await getSambaConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkSamba",
      error: configResult.error,
      message: "Failed to fetch samba configuration",
    });
    return err(configResult.error);
  }

  const config = configResult.value.val;

  if (!config.enabled) {
    logger.info({
      operation: "checkSamba",
      message: "Samba is disabled, allowing access",
    });
    return ok({
      allowed: true,
      level: "none",
      sambaCode: SAMBA_CODE_CAUTION,
      reason: "",
    });
  }

  const trackingResult = await getSambaTrackingRepository(
    vakContext,
    params.hostIdentifier
  );

  if (trackingResult.isErr()) {
    logger.error({
      operation: "checkSamba",
      error: trackingResult.error,
      message: "Failed to fetch samba tracking record",
    });
    return err(trackingResult.error);
  }

  const tracking = trackingResult.value;

  if (!tracking) {
    logger.info({
      operation: "checkSamba",
      hostIdentifier: params.hostIdentifier,
      message: "No tracking record, allowing access",
    });
    return ok({
      allowed: true,
      level: "none",
      sambaCode: SAMBA_CODE_CAUTION,
      reason: "",
    });
  }

  const level = tracking.val.currentLevel;

  if (level === "none" || level === "caution") {
    logger.info({
      operation: "checkSamba",
      hostIdentifier: params.hostIdentifier,
      level,
      message: "Level allows posting",
    });
    return ok({
      allowed: true,
      level,
      sambaCode:
        level === "caution" ? SAMBA_CODE_CAUTION : SAMBA_CODE_CAUTION,
      reason: "",
    });
  }

  const now = new Date();
  if (tracking.val.banUntil && tracking.val.banUntil > now) {
    const remainingMinutes = Math.ceil(
      (tracking.val.banUntil.getTime() - now.getTime()) / 60000
    );

    const sambaCode =
      level === "banned"
        ? SAMBA_CODE_BANNED
        : level === "listed"
          ? SAMBA_CODE_LISTED
          : SAMBA_CODE_WARNING;

    const reason =
      level === "banned"
        ? "このホストは投稿停止中です"
        : level === "listed"
          ? "このホストは規制中です。規制が解除されるまでお待ちください。"
          : `投稿警告中です（残り${remainingMinutes}分）`;

    logger.warn({
      operation: "checkSamba",
      hostIdentifier: params.hostIdentifier,
      level,
      sambaCode,
      banUntil: tracking.val.banUntil.toISOString(),
      remainingMinutes,
      message: "Host is currently regulated by samba",
    });

    return ok({
      allowed: false,
      level,
      sambaCode,
      reason,
      banUntil: tracking.val.banUntil,
    });
  }

  logger.info({
    operation: "checkSamba",
    hostIdentifier: params.hostIdentifier,
    level,
    message: "Ban has expired, allowing access",
  });

  return ok({
    allowed: true,
    level,
    sambaCode: SAMBA_CODE_CAUTION,
    reason: "",
  });
};
