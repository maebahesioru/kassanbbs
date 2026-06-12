import { err, ok } from "neverthrow";

import { getAllThreadsRepository } from "../repositories/getAllThreadsRepository";

import type { VakContext } from "../../shared/types/VakContext";

// すべてのスレッドを取得するユースケース
export const getAllThreadsPageUsecase = async (
  vakContext: VakContext,
  boardId?: string
) => {
  const { logger } = vakContext;

  logger.info({
    operation: "getAllThreadsPage",
    boardId,
    message: "Starting all threads retrieval",
  });

  logger.debug({
    operation: "getAllThreadsPage",
    message: "Fetching all threads from repository",
  });

  const threadsResult = await getAllThreadsRepository(vakContext, { boardId });
  if (threadsResult.isErr()) {
    logger.error({
      operation: "getAllThreadsPage",
      error: threadsResult.error,
      message: "Failed to fetch all threads",
    });
    return err(threadsResult.error);
  }

  const visibleThreads = threadsResult.value.filter(
    (thread) => !thread.isPooled
  );

  logger.info({
    operation: "getAllThreadsPage",
    threadCount: visibleThreads.length,
    message: "Successfully retrieved all threads",
  });

  return ok(visibleThreads);
};
