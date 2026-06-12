import { err, ok } from "neverthrow";

import { getSpamConfigRepository } from "../repositories/getSpamConfigRepository";
import { calculateSpamScore } from "../spamDetectionService";
import { analyzeFingerprint } from "../../fingerprint/services/fingerprintService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkSpamUsecase = async (
  vakContext: VakContext,
  params: {
    content: string;
    authorName: string;
    mail: string;
    browserFpRaw?: string | null;
  }
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkSpam",
    contentLength: params.content.length,
    authorName: params.authorName,
    message: "Starting spam check",
  });

  logger.debug({
    operation: "checkSpam",
    message: "Fetching spam detection configuration",
  });

  const configResult = await getSpamConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkSpam",
      error: configResult.error,
      message: "Failed to fetch spam detection configuration",
    });
    return err(configResult.error);
  }

  const { enableSpamDetection, spamThreshold } = configResult.value.val;

  if (!enableSpamDetection) {
    logger.info({
      operation: "checkSpam",
      message: "Spam detection is disabled, allowing post",
    });
    return ok(true);
  }

  logger.debug({
    operation: "checkSpam",
    message: "Calculating spam score",
  });

  const spamScore = calculateSpamScore(
    params.content,
    params.authorName,
    params.mail
  );

  if (params.browserFpRaw) {
    const fpResult = analyzeFingerprint(params.browserFpRaw);
    if (fpResult.isSuspicious) {
      logger.info({
        operation: "checkSpam",
        reasons: fpResult.reasons,
        message: "Suspicious fingerprint detected",
      });
      return ok(false);
    }
  }

  logger.info({
    operation: "checkSpam",
    spamScore,
    spamThreshold,
    message: "Spam score calculated",
  });

  if (spamScore >= spamThreshold) {
    logger.warn({
      operation: "checkSpam",
      spamScore,
      spamThreshold,
      message: "Post blocked by spam detection",
    });
    return ok(false);
  }

  logger.info({
    operation: "checkSpam",
    message: "Post passed spam detection",
  });

  return ok(true);
};
