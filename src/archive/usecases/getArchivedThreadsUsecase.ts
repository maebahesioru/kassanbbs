import { err, ok } from "neverthrow";

import { getArchivedThreadsRepository } from "../repositories/getArchivedThreadsRepository";

import type { ReadThread } from "../../conversation/domain/read/ReadThread";
import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getArchivedThreadsUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadThread[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getArchivedThreadsUsecase",
    message: "Starting archived threads retrieval",
  });

  const threadsResult = await getArchivedThreadsRepository(vakContext);
  if (threadsResult.isErr()) {
    logger.error({
      operation: "getArchivedThreadsUsecase",
      error: threadsResult.error,
      message: "Failed to fetch archived threads",
    });
    return err(threadsResult.error);
  }

  logger.info({
    operation: "getArchivedThreadsUsecase",
    threadCount: threadsResult.value.length,
    message: "Successfully retrieved archived threads",
  });

  return ok(threadsResult.value);
};
