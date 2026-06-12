import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const softDeleteResponseRepository = async (
  { sql, logger }: VakContext,
  params: {
    threadId: string;
    responseNumber: number;
    deletedByHashId: string;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "softDeleteResponse",
    threadId: params.threadId,
    responseNumber: params.responseNumber,
    message: "Soft-deleting response",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE responses
        SET
          is_deleted = TRUE,
          deleted_by = ${params.deletedByHashId},
          deleted_at = NOW()
        WHERE
          thread_id = ${params.threadId}::uuid
          AND response_number = ${params.responseNumber}
          AND is_deleted = FALSE
        RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "softDeleteResponse",
        threadId: params.threadId,
        responseNumber: params.responseNumber,
        message: "Failed to soft-delete response, response not found or already deleted",
      });
      return err(new DatabaseError("レスポンスの削除に失敗しました"));
    }

    logger.info({
      operation: "softDeleteResponse",
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: "Response soft-deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "softDeleteResponse",
      error,
      threadId: params.threadId,
      responseNumber: params.responseNumber,
      message: `Database error while soft-deleting response: ${message}`,
    });
    return err(
      new DatabaseError(`レスポンス削除中にエラーが発生しました: ${message}`, error)
    );
  }
};
