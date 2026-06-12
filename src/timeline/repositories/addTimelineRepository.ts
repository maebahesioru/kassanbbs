import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addTimelineRepository = async (
  { sql, logger }: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    authorName: string;
    mail: string;
    responseContent: string;
    hashId: string;
    postedAt: Date;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "addTimeline",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Adding timeline entry to database",
  });

  const id = uuidv7();

  try {
    const result = await sql`
      INSERT INTO timeline(id, thread_id, response_number, author_name, mail, response_content, hash_id, posted_at)
      VALUES(${id}::uuid, ${params.threadId}::uuid, ${params.responseNumber}, ${params.authorName}, ${params.mail}, ${params.responseContent}, ${params.hashId}, ${params.postedAt})
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addTimeline",
        params,
        message: "Failed to add timeline entry, invalid database response",
      });
      return err(new DatabaseError("タイムラインの記録に失敗しました"));
    }

    logger.info({
      operation: "addTimeline",
      id,
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: "Timeline entry added successfully",
    });

    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addTimeline",
      error,
      message: msg,
    });
    return err(new DatabaseError("タイムラインの記録に失敗しました", error));
  }
};
