import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type TimelineEntry = {
  id: string;
  thread_id: string;
  response_number: number;
  author_name: string;
  mail: string;
  response_content: string;
  hash_id: string;
  posted_at: Date;
  created_at: Date;
};

export const getTimelineRepository = async (
  { sql, logger }: VakContext,
  params: { threadId?: string; limit?: number }
): Promise<Result<TimelineEntry[], DatabaseError>> => {
  const limit = params.limit || 50;

  logger.debug({
    operation: "getTimeline",
    threadId: params.threadId,
    limit,
    message: "Fetching timeline entries",
  });

  try {
    const rows = params.threadId
      ? await sql<TimelineEntry[]>`
          SELECT id, thread_id, response_number, author_name, mail, response_content, hash_id, posted_at, created_at FROM timeline WHERE thread_id = ${params.threadId}::uuid ORDER BY posted_at DESC LIMIT ${limit}`
      : await sql<TimelineEntry[]>`
          SELECT id, thread_id, response_number, author_name, mail, response_content, hash_id, posted_at, created_at FROM timeline ORDER BY posted_at DESC LIMIT ${limit}`;

    logger.info({
      operation: "getTimeline",
      threadId: params.threadId,
      count: rows.length,
      message: "Timeline entries fetched successfully",
    });

    return ok(rows || []);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getTimeline",
      error,
      message: msg,
    });
    return err(new DatabaseError("タイムラインの取得に失敗しました", error));
  }
};
