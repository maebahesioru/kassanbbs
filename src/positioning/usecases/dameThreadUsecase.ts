import { setThreadPositionRepository } from "../repositories/setThreadPositionRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const dameThreadUsecase = async (
  vakContext: VakContext,
  params: { threadId: string }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "dameThread",
    threadId: params.threadId,
    message: "Moving thread to bottom (dame)",
  });

  const result = await setThreadPositionRepository(vakContext, {
    threadId: params.threadId,
    updatedAt: new Date(0),
  });
  if (result.isErr()) {
    logger.error({
      operation: "dameThread",
      error: result.error,
      threadId: params.threadId,
      message: "Failed to dame thread",
    });
    return result;
  }

  logger.info({
    operation: "dameThread",
    threadId: params.threadId,
    message: "Thread damed successfully",
  });

  return result;
};
