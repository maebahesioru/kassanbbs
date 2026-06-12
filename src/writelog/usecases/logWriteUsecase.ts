import { addWriteLogRepository } from "../repositories/addWriteLogRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const logWriteUsecase = async (
  vakContext: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    hashId: string;
    authorName: string;
    mail: string;
    contentLength: number;
    postedAt: Date;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "logWrite",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Logging write information",
  });

  const result = await addWriteLogRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "logWrite",
      error: result.error,
      threadId: params.threadId,
      message: "Failed to log write information",
    });
    return result;
  }

  logger.info({
    operation: "logWrite",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Write information logged successfully",
  });

  return result;
};
