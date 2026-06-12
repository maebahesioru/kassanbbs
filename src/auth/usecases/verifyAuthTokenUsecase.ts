import { err, ok } from "neverthrow";

import { verifyAuthTokenRepository } from "../repositories/verifyAuthTokenRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

const AUTH_TOKEN_REGEX = /^!auth:(\d{6})$/i;

export const extractAuthToken = (mail: string): string | null => {
  const match = mail.trim().match(AUTH_TOKEN_REGEX);
  if (match) {
    return match[1];
  }
  return null;
};

export const verifyAuthTokenUsecase = async (
  vakContext: VakContext,
  { mail, ipAddress }: { mail: string | null; ipAddress: string }
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "verifyAuthToken",
    hasMail: mail !== null,
    message: "Checking for auth token in mail field",
  });

  if (!mail) {
    logger.debug({
      operation: "verifyAuthToken",
      message: "No mail field, skipping auth token check",
    });
    return ok(false);
  }

  const token = extractAuthToken(mail);
  if (!token) {
    logger.debug({
      operation: "verifyAuthToken",
      message: "No auth token found in mail field",
    });
    return ok(false);
  }

  logger.debug({
    operation: "verifyAuthToken",
    message: "Auth token found in mail field, verifying",
  });

  const verifyResult = await verifyAuthTokenRepository(vakContext, {
    token,
    ipAddress,
  });
  if (verifyResult.isErr()) {
    logger.error({
      operation: "verifyAuthToken",
      error: verifyResult.error,
      message: "Failed to verify auth token",
    });
    return err(verifyResult.error);
  }

  if (!verifyResult.value) {
    logger.warn({
      operation: "verifyAuthToken",
      message: "Auth token verification failed",
    });
    return ok(false);
  }

  logger.info({
    operation: "verifyAuthToken",
    message: "Auth token verified successfully, captcha bypassed",
  });

  return ok(true);
};
