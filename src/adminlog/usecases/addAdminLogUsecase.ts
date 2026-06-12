import { addAdminLogRepository } from "../repositories/addAdminLogRepository";

import type { AdminLogType } from "../repositories/addAdminLogRepository";
import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addAdminLogUsecase = async (
  vakContext: VakContext,
  params: {
    action: string;
    detail: string;
    ipAddress: string;
    logType?: AdminLogType;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "addAdminLog",
    action: params.action,
    logType: params.logType,
    message: "Adding admin log entry",
  });

  const result = await addAdminLogRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "addAdminLog",
      error: result.error,
      action: params.action,
      message: "Failed to add admin log entry",
    });
    return result;
  }

  logger.info({
    operation: "addAdminLog",
    action: params.action,
    message: "Admin log entry added successfully",
  });

  return result;
};
