import { err, ok } from "neverthrow";

import { createAuthTokenRepository } from "../repositories/createAuthTokenRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const issueAuthTokenUsecase = async (
  vakContext: VakContext,
  { ipAddress, sessionId }: { ipAddress: string; sessionId: string }
): Promise<Result<string, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "issueAuthToken",
    sessionId,
    message: "Issuing auth token after captcha verification",
  });

  const tokenResult = await createAuthTokenRepository(vakContext, {
    ipAddress,
    sessionId,
  });
  if (tokenResult.isErr()) {
    logger.error({
      operation: "issueAuthToken",
      error: tokenResult.error,
      sessionId,
      message: "Failed to create auth token",
    });
    return err(tokenResult.error);
  }

  logger.info({
    operation: "issueAuthToken",
    sessionId,
    message: "Auth token issued successfully",
  });

  return ok(tokenResult.value);
};
