import { ok, err } from "neverthrow";
import { Result } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import { createReadPostedAt } from "../domain/read/ReadPostedAt";
import { createReadThread, type ReadThread } from "../domain/read/ReadThread";
import { createReadThreadId } from "../domain/read/ReadThreadId";
import { createReadThreadTitle } from "../domain/read/ReadThreadTitle";
import {
  createThreadAttr,
  type ThreadAttr,
} from "../domain/read/ReadThreadAttr";

import type { ValidationError } from "../../shared/types/Error";
import type { VakContext } from "../../shared/types/VakContext";

// updated_atが新しい順に30個のスレッドを取得
// かつ、新しい先頭の10個は、レスポンスの内容も含めて取得
// レスポンスの内容は、先頭のレスポンス一つと、posted_atが新しい順に10個
export const getLatest30ThreadsRepository = async (
  { sql, logger }: VakContext,
  { boardId }: { boardId?: string } = {}
): Promise<
  Result<ReadThread[], DatabaseError | DataNotFoundError | ValidationError>
> => {
  logger.debug({
    operation: "getLatest30Threads",
    boardId,
    message: "Fetching latest 30 threads ordered by updated_at",
  });

  try {
    const result = await sql<
      {
        id: string;
        title: string;
        posted_at: Date;
        updated_at: Date;
        response_count: number;
        is_stopped: boolean;
        is_pooled: boolean;
        max_responses: number;
        attrs: ThreadAttr;
        board_id: string;
      }[]
    >`
        SELECT
            t.id,
            t.title,
            t.posted_at,
            t.updated_at,
            COUNT(r.id)::int as response_count,
            t.is_stopped,
            t.is_pooled,
            t.max_responses,
            t.attrs,
            t.board_id
        FROM
            threads as t
            LEFT JOIN
                responses as r
            ON  t.id = r.thread_id
        WHERE
            t.is_stopped = FALSE
            ${boardId ? sql`AND t.board_id = ${boardId}::uuid` : sql``}
        GROUP BY
            t.id,
            t.title,
            t.is_stopped,
            t.is_pooled,
            t.max_responses,
            t.attrs,
            t.board_id
        ORDER BY
            (t.attrs->>'sticky')::boolean DESC,
            t.updated_at DESC
        LIMIT 30
    `;

    if (!result || result.length === 0) {
      logger.info({
        operation: "getLatest30Threads",
        message: "No threads found in database",
      });
      return err(new DataNotFoundError("スレッドの取得に失敗しました"));
    }

    logger.debug({
      operation: "getLatest30Threads",
      count: result.length,
      message: "Successfully retrieved threads from database",
    });

    // 詰め替え部分
    const threads: ReadThread[] = [];
    for (const thread of result) {
      const combinedResult = Result.combine([
        createReadThreadId(thread.id),
        createReadThreadTitle(thread.title),
        createReadPostedAt(thread.posted_at),
        createReadPostedAt(thread.updated_at),
      ]);

      if (combinedResult.isErr()) {
        logger.error({
          operation: "getLatest30Threads",
          error: combinedResult.error,
          threadId: thread.id,
          message: "Failed to create domain objects from database result",
        });
        return err(combinedResult.error);
      }
      const [threadId, title, postedAt, updatedAt] = combinedResult.value;

      const attrsResult = createThreadAttr(
        (thread.attrs as Record<string, unknown>) ?? {}
      );
      if (attrsResult.isErr()) {
        logger.error({
          operation: "getLatest30Threads",
          error: attrsResult.error,
          threadId: thread.id,
          message: "Failed to parse thread attrs",
        });
        return err(attrsResult.error);
      }

      const threadResult = createReadThread({
        id: threadId,
        title,
        postedAt,
        updatedAt,
        countResponse: thread.response_count,
        isStopped: thread.is_stopped,
        isPooled: thread.is_pooled,
        maxResponses: thread.max_responses,
        attrs: attrsResult.value,
      });

      if (threadResult.isErr()) {
        logger.error({
          operation: "getLatest30Threads",
          error: threadResult.error,
          threadId: thread.id,
          message: "Failed to create ReadThread object",
        });
        return err(threadResult.error);
      }

      threads.push(threadResult.value);
    }

    logger.info({
      operation: "getLatest30Threads",
      threadCount: threads.length,
      message: "Successfully fetched and processed latest threads",
    });

    return ok(threads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getLatest30Threads",
      error,
      message: `Database error while fetching threads: ${message}`,
    });
    return err(
      new DatabaseError(
        `スレッド取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
