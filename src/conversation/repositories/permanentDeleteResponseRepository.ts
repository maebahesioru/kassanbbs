import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import { renumberResponses } from "../../anchor/services/anchorRenumberService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type ResponseRow = {
  id: string;
  thread_id: string;
  response_number: number;
  response_content: string;
};

export const permanentDeleteResponseRepository = async (
  { sql, logger }: VakContext,
  {
    threadId,
    responseNumber,
  }: {
    threadId: string;
    responseNumber: number;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "permanentDeleteResponse",
    threadId,
    responseNumber,
    message: "Permanently deleting response",
  });

  try {
    await sql.begin(async (sql) => {
      const deleteResult = await sql<{ id: string }[]>`
          DELETE FROM responses
          WHERE thread_id = ${threadId}::uuid
            AND response_number = ${responseNumber}
          RETURNING id
        `;

      if (!deleteResult || deleteResult.length !== 1) {
        throw new DatabaseError("レスポンスの削除に失敗しました");
      }

      const remaining = await sql<ResponseRow[]>`
          SELECT id, thread_id, response_number, response_content
          FROM responses
          WHERE thread_id = ${threadId}::uuid
          ORDER BY response_number
        `;

      if (remaining && remaining.length > 0) {
        const renumbered = renumberResponses(
          remaining.map((r) => ({
            id: r.id,
            number: r.response_number,
            content: r.response_content,
          })),
          responseNumber
        );

        for (const r of renumbered) {
          if (r.number !== remaining.find((orig) => orig.id === r.id)?.response_number || r.content !== remaining.find((orig) => orig.id === r.id)?.response_content) {
            await sql`
                UPDATE responses
                SET response_number = ${r.number}, response_content = ${r.content}
                WHERE id = ${r.id}::uuid
              `;
          }
        }
      }
    });

    logger.info({
      operation: "permanentDeleteResponse",
      threadId,
      responseNumber,
      message: "Response permanently deleted and remaining responses renumbered",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "permanentDeleteResponse",
      error,
      threadId,
      responseNumber,
      message: `Database error while permanently deleting response: ${message}`,
    });
    return err(
      new DatabaseError(`レスポンス完全削除中にエラーが発生しました: ${message}`, error)
    );
  }
};
