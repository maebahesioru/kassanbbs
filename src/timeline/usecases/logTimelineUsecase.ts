import { addTimelineRepository } from "../repositories/addTimelineRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const logTimelineUsecase = async (
  vakContext: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    authorName: string;
    mail: string;
    responseContent: string;
    hashId: string;
    postedAt: Date;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "logTimeline",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Logging timeline entry",
  });

  const result = await addTimelineRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "logTimeline",
      error: result.error,
      threadId: params.threadId,
      message: "Failed to log timeline entry",
    });
    return result;
  }

  logger.info({
    operation: "logTimeline",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Timeline entry logged successfully",
  });

  return result;
};
