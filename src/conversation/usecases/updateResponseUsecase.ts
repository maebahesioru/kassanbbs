import { err, ok } from "neverthrow";

import { updateResponseRepository } from "../repositories/updateResponseRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateResponseUsecase = async (
  vakContext: VakContext,
  {
    threadId,
    responseNumber,
    authorName,
    mail,
    responseContent,
  }: {
    threadId: string;
    responseNumber: number;
    authorName: string;
    mail: string;
    responseContent: string;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateResponse",
    threadId,
    responseNumber,
    message: "Starting response update",
  });

  const result = await updateResponseRepository(vakContext, {
    threadId,
    responseNumber,
    authorName,
    mail,
    responseContent,
  });

  if (result.isErr()) {
    logger.error({
      operation: "updateResponse",
      error: result.error,
      threadId,
      responseNumber,
      message: "Failed to update response",
    });
    return err(result.error);
  }

  logger.info({
    operation: "updateResponse",
    threadId,
    responseNumber,
    message: "Response updated successfully",
  });

  return ok(undefined);
};
