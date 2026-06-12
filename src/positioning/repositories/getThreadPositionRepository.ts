import { ok, err } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type ThreadPositionInfo = {
  updatedAt: Date;
  surrounding: Array<{ threadId: string; updatedAt: Date }>;
};

export const getThreadPositionRepository = async (
  { sql, logger }: VakContext,
  { threadId }: { threadId: string }
): Promise<Result<ThreadPositionInfo, DatabaseError | DataNotFoundError>> => {
  logger.debug({
    operation: "getThreadPosition",
    threadId,
    message: "Fetching thread position info",
  });

  try {
    const currentResult = await sql<{ updated_at: Date }[]>`
      SELECT updated_at FROM threads WHERE id = ${threadId}::uuid
    `;

    if (!currentResult || currentResult.length !== 1) {
      logger.error({
        operation: "getThreadPosition",
        threadId,
        message: "Thread not found",
      });
      return err(new DataNotFoundError("スレッドが見つかりません"));
    }

    const currentUpdatedAt = currentResult[0].updated_at;

    const surroundingResult = await sql<
      { id: string; updated_at: Date }[]
    >`
      SELECT id, updated_at
      FROM threads
      WHERE is_archived = FALSE
      ORDER BY updated_at DESC, posted_at DESC
    `;

    logger.info({
      operation: "getThreadPosition",
      threadId,
      message: "Thread position info retrieved successfully",
    });

    return ok({
      updatedAt: currentUpdatedAt,
      surrounding: surroundingResult.map((r) => ({
        threadId: r.id,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getThreadPosition",
      threadId,
      error,
      message: `Database error while fetching thread position: ${message}`,
    });
    return err(
      new DatabaseError(`スレッド位置取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
