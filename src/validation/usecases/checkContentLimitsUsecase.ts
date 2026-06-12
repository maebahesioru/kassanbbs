import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { getContentLimitConfigRepository } from "../repositories/getContentLimitConfigRepository";
import { checkContentLimits } from "../services/contentLimitsService";

import type { VakContext } from "../../shared/types/VakContext";
import type { ContentLimitResult } from "../services/contentLimitsService";
import type { Result } from "neverthrow";

export const checkContentLimitsUsecase = async (
  vakContext: VakContext,
  content: string
): Promise<Result<ContentLimitResult, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkContentLimits",
    contentLength: content.length,
    message: "Starting content limits check",
  });

  const configResult = await getContentLimitConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkContentLimits",
      error: configResult.error,
      message: "Failed to get content limit configuration",
    });
    return err(configResult.error);
  }

  const limitsResult = checkContentLimits(content, configResult.value);

  if (!limitsResult.valid) {
    logger.warn({
      operation: "checkContentLimits",
      reason: limitsResult.reason,
      lineCount: limitsResult.lineCount,
      maxLineWidth: limitsResult.maxLineWidth,
      anchorCount: limitsResult.anchorCount,
      message: "Content exceeds limits",
    });
    return err(new ValidationError(limitsResult.reason ?? "コンテンツが制限を超えています"));
  }

  logger.info({
    operation: "checkContentLimits",
    lineCount: limitsResult.lineCount,
    maxLineWidth: limitsResult.maxLineWidth,
    anchorCount: limitsResult.anchorCount,
    message: "Content limits check passed",
  });

  return ok(limitsResult);
};
