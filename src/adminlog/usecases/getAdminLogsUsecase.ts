import { getAdminLogsRepository } from "../repositories/getAdminLogsRepository";

import type { AdminLogType } from "../repositories/addAdminLogRepository";
import type { VakContext } from "../../shared/types/VakContext";
import type { AdminLog } from "../repositories/getAdminLogsRepository";
import type { Result } from "neverthrow";

export const getAdminLogsUsecase = async (
  vakContext: VakContext,
  limit?: number,
  logType?: AdminLogType
): Promise<Result<AdminLog[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getAdminLogs",
    limit,
    logType,
    message: "Retrieving admin logs",
  });

  const result = await getAdminLogsRepository(vakContext, limit, logType);
  if (result.isErr()) {
    logger.error({
      operation: "getAdminLogs",
      error: result.error,
      message: "Failed to retrieve admin logs",
    });
    return result;
  }

  logger.info({
    operation: "getAdminLogs",
    count: result.value.length,
    message: "Admin logs retrieved successfully",
  });

  return result;
};
