import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { getNormalConfigRepository } from "../../config/repositories/getNormalConfigRepository";
import { checkDnsbl } from "../services/dnsblService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkDnsblUsecase = async (
  vakContext: VakContext,
  ip: string
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkDnsbl",
    ip,
    message: "Starting DNSBL check",
  });

  const configResult = await getNormalConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkDnsbl",
      error: configResult.error,
      message: "Failed to fetch config for DNSBL check",
    });
    return err(configResult.error);
  }

  const { enableDnsbl, dnsblHostnames } = configResult.value;

  logger.debug({
    operation: "checkDnsbl",
    enableDnsbl,
    dnsblHostnames,
    message: "DNSBL config loaded",
  });

  if (!ip) {
    logger.debug({
      operation: "checkDnsbl",
      message: "No IP provided, skipping DNSBL check",
    });
    return ok(true);
  }

  if (!enableDnsbl || !dnsblHostnames.trim()) {
    logger.info({
      operation: "checkDnsbl",
      message: "DNSBL is disabled or no hostnames configured, skipping",
    });
    return ok(true);
  }

  const hostnames = dnsblHostnames.split(",").map((h) => h.trim()).filter(Boolean);

  logger.debug({
    operation: "checkDnsbl",
    ip,
    hostnames,
    message: "Checking IP against DNSBL services",
  });

  const result = await checkDnsbl(ip, hostnames);

  if (result.listed) {
    logger.warn({
      operation: "checkDnsbl",
      ip,
      listedServices: result.services,
      message: "IP listed in DNSBL, blocking access",
    });
    return err(new ValidationError("アクセスが拒否されました"));
  }

  logger.info({
    operation: "checkDnsbl",
    ip,
    message: "DNSBL check passed",
  });

  return ok(true);
};
