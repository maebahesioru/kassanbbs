import { addHostLogRepository } from "../repositories/addHostLogRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const logHostUsecase = async (
  vakContext: VakContext,
  params: { host: string; ipAddress: string; hashId: string; userAgent: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "logHost",
    ipAddress: params.ipAddress,
    host: params.host,
    message: "Logging host information",
  });

  const result = await addHostLogRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "logHost",
      error: result.error,
      ipAddress: params.ipAddress,
      message: "Failed to log host information",
    });
    return result;
  }

  logger.info({
    operation: "logHost",
    ipAddress: params.ipAddress,
    message: "Host information logged successfully",
  });

  return result;
};
