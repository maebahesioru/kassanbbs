import { err, ok } from "neverthrow";

import { permanentDeleteResponseRepository } from "../repositories/permanentDeleteResponseRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const permanentDeleteResponseUsecase = async (
  vakContext: VakContext,
  {
    threadId,
    responseNumber,
  }: {
    threadId: string;
    responseNumber: number;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "permanentDeleteResponse",
    threadId,
    responseNumber,
    message: "Starting permanent response deletion",
  });

  const result = await permanentDeleteResponseRepository(vakContext, {
    threadId,
    responseNumber,
  });

  if (result.isErr()) {
    logger.error({
      operation: "permanentDeleteResponse",
      error: result.error,
      threadId,
      responseNumber,
      message: "Failed to permanently delete response",
    });
    return err(result.error);
  }

  logger.info({
    operation: "permanentDeleteResponse",
    threadId,
    responseNumber,
    message: "Response permanently deleted and renumbered",
  });

  return ok(undefined);
};
