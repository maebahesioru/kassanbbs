import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import { VAK_VERSION } from "../../shared/version";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addWriteLogRepository = async (
  { sql, logger }: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    hashId: string;
    authorName: string;
    mail: string;
    contentLength: number;
    postedAt: Date;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "addWriteLog",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Adding write log entry to database",
  });

  const id = uuidv7();

  try {
    const result = await sql`
      INSERT INTO write_logs(
        id, thread_id, response_number, hash_id,
        author_name, mail, content_length, posted_at, version
      )
      VALUES(
        ${id}::uuid,
        ${params.threadId}::uuid,
        ${params.responseNumber},
        ${params.hashId},
        ${params.authorName},
        ${params.mail},
        ${params.contentLength},
        ${params.postedAt},
        ${VAK_VERSION}
      )
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addWriteLog",
        params,
        message: "Failed to add write log, invalid database response",
      });
      return err(new DatabaseError("書き込みログの追加に失敗しました"));
    }

    logger.info({
      operation: "addWriteLog",
      id,
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: "Write log entry added successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addWriteLog",
      error,
      params,
      message: `Database error while adding write log: ${message}`,
    });
    return err(
      new DatabaseError(
        `書き込みログの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
