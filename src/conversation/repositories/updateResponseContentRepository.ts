import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateResponseContentRepository = async (
  { sql, logger }: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    appendText: string;
    updatedByHashId: string;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateResponseContent",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Appending text to response",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE responses
        SET
          response_content = response_content || ${params.appendText}
        WHERE
          thread_id = ${params.threadId}::uuid
          AND response_number = ${params.responseNumber}
          AND is_deleted = FALSE
        RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateResponseContent",
        threadId: params.threadId,
        responseNumber: params.responseNumber,
        message: "Failed to update response content, response not found or deleted",
      });
      return err(new DatabaseError("レスポンスの更新に失敗しました"));
    }

    logger.info({
      operation: "updateResponseContent",
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: "Response content updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateResponseContent",
      error,
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: `Database error while updating response content: ${message}`,
    });
    return err(
      new DatabaseError(`レスポンス更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
