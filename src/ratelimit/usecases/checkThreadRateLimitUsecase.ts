import { err, ok } from "neverthrow";

import { checkThreadCreationRateRepository } from "../repositories/checkThreadCreationRateRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkThreadRateLimitUsecase = async (
  vakContext: VakContext,
  params: {
    hostIdentifier: string;
    hourLimit?: number;
    closeLimit?: number;
    closeMinutes?: number;
  }
): Promise<
  Result<{ allowed: boolean; hourlyCount: number; closeCount: number; reason?: string }, Error>
> => {
  const { logger } = vakContext;

  const hourLimit = params.hourLimit ?? 5;
  const closeLimit = params.closeLimit ?? 2;
  const closeMinutes = params.closeMinutes ?? 5;

  logger.info({
    operation: "checkThreadRateLimit",
    hostIdentifier: params.hostIdentifier,
    hourLimit,
    closeLimit,
    closeMinutes,
    message: "Checking thread creation rate limits",
  });

  const result = await checkThreadCreationRateRepository(vakContext, {
    hostIdentifier: params.hostIdentifier,
    hourLimit,
    closeLimit,
    closeMinutes,
  });

  if (result.isErr()) {
    logger.error({
      operation: "checkThreadRateLimit",
      error: result.error,
      message: "Failed to check thread creation rate",
    });
    return err(result.error);
  }

  const { hourlyCount, closeCount, allowed } = result.value;

  if (!allowed) {
    const closeReason =
      closeCount >= closeLimit
        ? `短期間に${closeLimit}回以上のスレッド作成がありました（${closeMinutes}分以内に${closeCount}回）`
        : `1時間以内に${hourLimit}回以上のスレッド作成がありました（${hourlyCount}回）`;

    logger.warn({
      operation: "checkThreadRateLimit",
      hostIdentifier: params.hostIdentifier,
      hourlyCount,
      closeCount,
      reason: closeReason,
      message: "Thread creation rate limit exceeded",
    });

    return ok({ allowed: false, hourlyCount, closeCount, reason: closeReason });
  }

  logger.info({
    operation: "checkThreadRateLimit",
    hostIdentifier: params.hostIdentifier,
    hourlyCount,
    closeCount,
    message: "Thread creation rate check passed",
  });

  return ok({ allowed: true, hourlyCount, closeCount });
};
