import { err, ok } from "neverthrow";

import { getAutoDeleteConfigRepository } from "../repositories/getAutoDeleteConfigRepository";
import { deleteExpiredThreadsRepository } from "../repositories/deleteExpiredThreadsRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const autoDeleteUsecase = async (
  vakContext: VakContext
): Promise<Result<number, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "autoDelete",
    message: "Starting auto-delete process",
  });

  const configResult = await getAutoDeleteConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "autoDelete",
      error: configResult.error,
      message: "Failed to fetch auto-delete configuration",
    });
    return err(configResult.error);
  }

  const config = configResult.value;

  if (!config.enabled) {
    logger.info({
      operation: "autoDelete",
      message: "Auto-delete is disabled, skipping",
    });
    return ok(0);
  }

  logger.debug({
    operation: "autoDelete",
    config,
    message: "Auto-delete enabled, proceeding with deletion",
  });

  const deleteResult = await deleteExpiredThreadsRepository(vakContext, {
    deleteAfterDays: config.deleteAfterDays,
    onlyIfStopped: config.onlyIfStopped,
    onlyIfNoResponsesDays: config.onlyIfNoResponsesDays,
  });

  if (deleteResult.isErr()) {
    logger.error({
      operation: "autoDelete",
      error: deleteResult.error,
      message: "Failed to delete expired threads",
    });
    return err(deleteResult.error);
  }

  logger.info({
    operation: "autoDelete",
    deletedCount: deleteResult.value,
    message: "Auto-delete process completed successfully",
  });

  return ok(deleteResult.value);
};
