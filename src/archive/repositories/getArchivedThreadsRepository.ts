import { ok, err, Result } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import { createReadPostedAt } from "../../conversation/domain/read/ReadPostedAt";
import { createReadThread, type ReadThread } from "../../conversation/domain/read/ReadThread";
import { createReadThreadId } from "../../conversation/domain/read/ReadThreadId";
import { createReadThreadTitle } from "../../conversation/domain/read/ReadThreadTitle";
import { createThreadAttr } from "../../conversation/domain/read/ReadThreadAttr";

import type { VakContext } from "../../shared/types/VakContext";

export const getArchivedThreadsRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<ReadThread[], DatabaseError | DataNotFoundError>> => {
  logger.debug({
    operation: "getArchivedThreads",
    message: "Fetching archived threads from database",
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
        t.max_responses
      FROM
        threads as t
        LEFT JOIN
          responses as r
        ON  t.id = r.thread_id
      WHERE
        t.is_stopped = TRUE
        AND t.is_pooled = TRUE
      GROUP BY
        t.id,
        t.title,
        t.is_stopped,
        t.is_pooled,
        t.max_responses
      ORDER BY
        t.updated_at DESC
    `;

    if (!result || result.length === 0) {
      logger.info({
        operation: "getArchivedThreads",
        message: "No archived threads found",
      });
      return ok([]);
    }

    logger.debug({
      operation: "getArchivedThreads",
      threadCount: result.length,
      message: "Retrieved archived threads from database, processing domain objects",
    });

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
          operation: "getArchivedThreads",
          error: combinedResult.error,
          threadId: thread.id,
          message: "Failed to create domain objects from archived thread data",
        });
        return err(combinedResult.error);
      }
      const [threadId, title, postedAt, updatedAt] = combinedResult.value;

      const attrs = createThreadAttr({});
      if (attrs.isErr()) {
        return err(attrs.error);
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
        attrs: attrs.value,
      });
      if (threadResult.isErr()) {
        logger.error({
          operation: "getArchivedThreads",
          error: threadResult.error,
          threadId: threadId.val,
          message: "Failed to create archived thread domain object",
        });
        return err(threadResult.error);
      }

      threads.push(threadResult.value);
    }

    logger.info({
      operation: "getArchivedThreads",
      threadCount: threads.length,
      message: "Successfully retrieved and processed archived threads",
    });

    return ok(threads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getArchivedThreads",
      error,
      message: `Database error while fetching archived threads: ${message}`,
    });
    return err(
      new DatabaseError(
        `アーカイブスレッド取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
