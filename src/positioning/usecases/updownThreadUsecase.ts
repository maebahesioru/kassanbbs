import { ok, err } from "neverthrow";

import { getThreadPositionRepository } from "../repositories/getThreadPositionRepository";
import { setThreadPositionRepository } from "../repositories/setThreadPositionRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const upThreadUsecase = async (
  vakContext: VakContext,
  params: { threadId: string; positions: number }
): Promise<Result<void, Error>> => {
  const { logger, sql } = vakContext;

  logger.info({
    operation: "upThread",
    threadId: params.threadId,
    positions: params.positions,
    message: "Moving thread up by N positions",
  });

  // Acquire row lock to prevent position corruption
  await sql`SELECT id FROM threads WHERE id = ${params.threadId}::uuid FOR UPDATE`;

  const positionResult = await getThreadPositionRepository(vakContext, {
    threadId: params.threadId,
  });
  if (positionResult.isErr()) {
    logger.error({
      operation: "upThread",
      error: positionResult.error,
      threadId: params.threadId,
      message: "Failed to get thread position",
    });
    return err(positionResult.error);
  }

  const { surrounding } = positionResult.value;
  const currentIndex = surrounding.findIndex(
    (t) => t.threadId === params.threadId
  );

  if (currentIndex === -1) {
    return ok(undefined);
  }

  const targetIndex = Math.max(0, currentIndex - params.positions);

  if (targetIndex === currentIndex || targetIndex < 0) {
    const result = await setThreadPositionRepository(vakContext, {
      threadId: params.threadId,
      updatedAt: new Date(),
    });
    return result;
  }

  const aboveTarget = surrounding[targetIndex];
  const oneAboveTarget =
    targetIndex > 0 ? surrounding[targetIndex - 1] : null;

  let targetTimestamp: Date;

  if (oneAboveTarget) {
    const between =
      (aboveTarget.updatedAt.getTime() + oneAboveTarget.updatedAt.getTime()) / 2;
    targetTimestamp = new Date(between);
  } else {
    targetTimestamp = new Date(aboveTarget.updatedAt.getTime() + 1000);
  }

  const result = await setThreadPositionRepository(vakContext, {
    threadId: params.threadId,
    updatedAt: targetTimestamp,
  });

  if (result.isOk()) {
    logger.info({
      operation: "upThread",
      threadId: params.threadId,
      positions: params.positions,
      targetTimestamp: targetTimestamp.toISOString(),
      message: "Thread moved up successfully",
    });
  }

  return result;
};

export const downThreadUsecase = async (
  vakContext: VakContext,
  params: { threadId: string; positions: number }
): Promise<Result<void, Error>> => {
  const { logger, sql } = vakContext;

  logger.info({
    operation: "downThread",
    threadId: params.threadId,
    positions: params.positions,
    message: "Moving thread down by N positions",
  });

  // Acquire row lock to prevent position corruption
  await sql`SELECT id FROM threads WHERE id = ${params.threadId}::uuid FOR UPDATE`;

  const positionResult = await getThreadPositionRepository(vakContext, {
    threadId: params.threadId,
  });
  if (positionResult.isErr()) {
    logger.error({
      operation: "downThread",
      error: positionResult.error,
      threadId: params.threadId,
      message: "Failed to get thread position",
    });
    return err(positionResult.error);
  }

  const { surrounding } = positionResult.value;
  const currentIndex = surrounding.findIndex(
    (t) => t.threadId === params.threadId
  );

  if (currentIndex === -1) {
    return ok(undefined);
  }

  const targetIndex = Math.min(
    surrounding.length - 1,
    currentIndex + params.positions
  );

  if (targetIndex === currentIndex || targetIndex >= surrounding.length) {
    const result = await setThreadPositionRepository(vakContext, {
      threadId: params.threadId,
      updatedAt: new Date(0),
    });
    return result;
  }

  const belowTarget = surrounding[targetIndex];
  const oneBelowTarget =
    targetIndex < surrounding.length - 1
      ? surrounding[targetIndex + 1]
      : null;

  let targetTimestamp: Date;

  if (oneBelowTarget) {
    const between =
      (belowTarget.updatedAt.getTime() + oneBelowTarget.updatedAt.getTime()) / 2;
    targetTimestamp = new Date(between);
  } else {
    targetTimestamp = new Date(belowTarget.updatedAt.getTime() - 1000);
  }

  const result = await setThreadPositionRepository(vakContext, {
    threadId: params.threadId,
    updatedAt: targetTimestamp,
  });

  if (result.isOk()) {
    logger.info({
      operation: "downThread",
      threadId: params.threadId,
      positions: params.positions,
      targetTimestamp: targetTimestamp.toISOString(),
      message: "Thread moved down successfully",
    });
  }

  return result;
};
