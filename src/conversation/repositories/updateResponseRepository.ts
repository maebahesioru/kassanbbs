import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateResponseRepository = async (
  { sql, logger }: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    authorName: string;
    mail: string;
    responseContent: string;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateResponse",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Updating response in database",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE responses
        SET
          author_name = ${params.authorName},
          mail = ${params.mail},
          response_content = ${params.responseContent}
        WHERE
          thread_id = ${params.threadId}::uuid
          AND response_number = ${params.responseNumber}
        RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateResponse",
        threadId: params.threadId,
        responseNumber: params.responseNumber,
        message: "Failed to update response, response not found",
      });
      return err(new DatabaseError("レスポンスの更新に失敗しました"));
    }

    logger.info({
      operation: "updateResponse",
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: "Response updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateResponse",
      error,
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: `Database error while updating response: ${message}`,
    });
    return err(
      new DatabaseError(`レスポンス更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
