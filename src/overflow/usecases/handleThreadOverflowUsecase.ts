import { err, ok } from "neverthrow";

import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";
import { updateThreadStoppedRepository } from "../../conversation/repositories/updateThreadStoppedRepository";
import { updateThreadPooledRepository } from "../../conversation/repositories/updateThreadPooledRepository";
import { createWriteThreadId } from "../../conversation/domain/write/WriteThreadId";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const handleThreadOverflowUsecase = async (
  vakContext: VakContext,
  params: {
    threadIdRaw: string;
    currentResponseCount: number;
    maxResponses: number;
    ipAddressRaw: string;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  if (params.currentResponseCount < params.maxResponses) {
    return ok(undefined);
  }

  logger.info({
    operation: "handleThreadOverflow",
    threadId: params.threadIdRaw,
    currentResponseCount: params.currentResponseCount,
    maxResponses: params.maxResponses,
    message: "Thread has reached max responses, generating overflow",
  });

  const writeThreadIdResult = createWriteThreadId(params.threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "handleThreadOverflow",
      error: writeThreadIdResult.error,
      threadId: params.threadIdRaw,
      message: "Failed to create thread ID for overflow",
    });
    return err(writeThreadIdResult.error);
  }

  const stopResult = await updateThreadStoppedRepository(vakContext, {
    threadId: writeThreadIdResult.value,
    isStopped: true,
  });
  if (stopResult.isErr()) {
    logger.error({
      operation: "handleThreadOverflow",
      error: stopResult.error,
      threadId: params.threadIdRaw,
      message: "Failed to stop thread",
    });
    return err(stopResult.error);
  }

  const poolResult = await updateThreadPooledRepository(vakContext, {
    threadId: writeThreadIdResult.value,
    isPooled: true,
  });
  if (poolResult.isErr()) {
    logger.error({
      operation: "handleThreadOverflow",
      error: poolResult.error,
      threadId: params.threadIdRaw,
      message: "Failed to pool thread",
    });
    return err(poolResult.error);
  }

  await addAdminLogRepository(vakContext, {
    action: "スレッドオーバーフロー",
    detail: `スレッドID: ${params.threadIdRaw} が上限 ${params.maxResponses} レスに達しました`,
    ipAddress: params.ipAddressRaw,
    logType: "HST",
  });

  logger.info({
    operation: "handleThreadOverflow",
    threadId: params.threadIdRaw,
    message: "Thread overflow handled successfully",
  });

  return ok(undefined);
};
