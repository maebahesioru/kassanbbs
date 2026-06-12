import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { getNormalConfigRepository } from "../../config/repositories/getNormalConfigRepository";
import { isVpnHostname } from "../vpnDetectionService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkVpnUsecase = async (
  vakContext: VakContext,
  hostname: string
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkVpn",
    hostname,
    message: "Starting VPN detection check",
  });

  const configResult = await getNormalConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkVpn",
      error: configResult.error,
      message: "Failed to fetch config for VPN detection",
    });
    return err(configResult.error);
  }

  const { enableVpnDetection } = configResult.value;

  if (!enableVpnDetection) {
    logger.info({
      operation: "checkVpn",
      message: "VPN detection is disabled, skipping",
    });
    return ok(true);
  }

  if (!hostname) {
    logger.debug({
      operation: "checkVpn",
      message: "No hostname provided, skipping VPN check",
    });
    return ok(true);
  }

  if (isVpnHostname(hostname)) {
    logger.warn({
      operation: "checkVpn",
      hostname,
      message: "VPN hostname detected, blocking access",
    });
    return err(new ValidationError("VPNからのアクセスは禁止されています"));
  }

  logger.info({
    operation: "checkVpn",
    hostname,
    message: "VPN check passed",
  });

  return ok(true);
};
