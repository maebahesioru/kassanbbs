import { addFailureLogRepository } from "../repositories/addFailureLogRepository";
import { getFailureLogsRepository } from "../repositories/getFailureLogsRepository";
import { deleteFailureLogRepository } from "../repositories/deleteFailureLogRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { FailureLog } from "../repositories/getFailureLogsRepository";
import type { Result } from "neverthrow";

export const logFailureUsecase = async (
  vakContext: VakContext,
  params: {
    errorCode: number;
    errorMessage: string;
    name: string;
    mail: string;
    content: string;
    ipAddress: string;
    host: string;
    threadKey: string;
    userAgent: string;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "logFailure",
    errorCode: params.errorCode,
    ipAddress: params.ipAddress,
    message: "Logging post failure",
  });

  const result = await addFailureLogRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "logFailure",
      error: result.error,
      errorCode: params.errorCode,
      message: "Failed to log post failure",
    });
    return result;
  }

  logger.info({
    operation: "logFailure",
    errorCode: params.errorCode,
    message: "Post failure logged successfully",
  });

  return result;
};

export const getFailureLogsUsecase = async (
  vakContext: VakContext
): Promise<Result<FailureLog[], Error>> => {
  const { logger } = vakContext;

  logger.info({ operation: "getFailureLogs", message: "Retrieving failure logs" });

  const result = await getFailureLogsRepository(vakContext);
  if (result.isErr()) {
    logger.error({ operation: "getFailureLogs", error: result.error, message: "Failed to retrieve failure logs" });
    return result;
  }

  logger.info({ operation: "getFailureLogs", count: result.value.length, message: "Failure logs retrieved successfully" });
  return result;
};

export const deleteFailureLogUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({ operation: "deleteFailureLog", id, message: "Deleting failure log" });

  const result = await deleteFailureLogRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({ operation: "deleteFailureLog", error: result.error, id, message: "Failed to delete failure log" });
    return result;
  }

  logger.info({ operation: "deleteFailureLog", id, message: "Failure log deleted successfully" });
  return result;
};
