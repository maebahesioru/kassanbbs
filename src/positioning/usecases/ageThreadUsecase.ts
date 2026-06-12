import { setThreadPositionRepository } from "../repositories/setThreadPositionRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const ageThreadUsecase = async (
  vakContext: VakContext,
  params: { threadId: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "ageThread",
    threadId: params.threadId,
    message: "Aging thread to top",
  });

  // Use DB NOW() to avoid clock jump issues
  const { sql } = vakContext;
  const [nowRow] = await sql<{ now: Date }[]>`SELECT NOW() as now`;
  const dbNow = nowRow?.now ?? new Date();
  const result = await setThreadPositionRepository(vakContext, {
    threadId: params.threadId,
    updatedAt: dbNow,
  });
  if (result.isErr()) {
    logger.error({
      operation: "ageThread",
      error: result.error,
      threadId: params.threadId,
      message: "Failed to age thread",
    });
    return result;
  }

  logger.info({
    operation: "ageThread",
    threadId: params.threadId,
    message: "Thread aged successfully",
  });

  return result;
};
