import { ok, err } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createThreadAttr,
  type ThreadAttr,
} from "../domain/read/ReadThreadAttr";

import type { VakContext } from "../../shared/types/VakContext";
import type { WriteThreadId } from "../domain/write/WriteThreadId";
import type { Result } from "neverthrow";

export type ThreadManagementInfo = {
  readonly isStopped: boolean;
  readonly isPooled: boolean;
  readonly maxResponses: number;
  readonly responseCount: number;
  readonly attrs: ThreadAttr;
};

export const getThreadManagementInfoRepository = async (
  { sql, logger }: VakContext,
  { threadId }: { threadId: WriteThreadId }
): Promise<Result<ThreadManagementInfo, DatabaseError | DataNotFoundError>> => {
  logger.debug({
    operation: "getThreadManagementInfo",
    threadId: threadId.val,
    message: "Fetching thread management info",
  });

  try {
    const result = await sql<
      {
        is_stopped: boolean;
        is_pooled: boolean;
        max_responses: number;
        response_count: number;
        attrs: ThreadAttr;
      }[]
    >`
        SELECT
            t.is_stopped,
            t.is_pooled,
            t.max_responses,
            COUNT(r.id)::int as response_count,
            t.attrs
        FROM
            threads as t
            LEFT JOIN
                responses as r
            ON  t.id = r.thread_id
            AND r.is_deleted = FALSE
        WHERE
            t.id = ${threadId.val}::uuid
        GROUP BY
            t.id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getThreadManagementInfo",
        threadId: threadId.val,
        message: "Thread not found",
      });
      return err(new DataNotFoundError("スレッドの取得に失敗しました"));
    }

    const info = result[0];

    const attrsResult = createThreadAttr(
      (info.attrs as Record<string, unknown>) ?? {}
    );
    if (attrsResult.isErr()) {
      logger.error({
        operation: "getThreadManagementInfo",
        threadId: threadId.val,
        error: attrsResult.error,
        message: "Failed to parse thread attrs",
      });
      return err(new DatabaseError("スレッド属性の取得に失敗しました"));
    }

    logger.info({
      operation: "getThreadManagementInfo",
      threadId: threadId.val,
      isStopped: info.is_stopped,
      isPooled: info.is_pooled,
      maxResponses: info.max_responses,
      responseCount: info.response_count,
      message: "Thread management info retrieved successfully",
    });

    return ok({
      isStopped: info.is_stopped,
      isPooled: info.is_pooled,
      maxResponses: info.max_responses,
      responseCount: info.response_count,
      attrs: attrsResult.value,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getThreadManagementInfo",
      threadId: threadId.val,
      error,
      message: `Database error while fetching thread info: ${message}`,
    });
    return err(
      new DatabaseError(`スレッド情報取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
