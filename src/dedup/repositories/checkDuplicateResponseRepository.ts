import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkDuplicateResponseRepository = async (
  { sql, logger }: VakContext,
  params: { contentHash: string; ipAddress: string; threadId: string }
): Promise<Result<boolean, DatabaseError>> => {
  logger.debug({
    operation: "checkDuplicateResponse",
    threadId: params.threadId,
    ipAddress: params.ipAddress,
    message: "Checking for duplicate response content",
  });

  try {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*) as count FROM responses
      WHERE thread_id = ${params.threadId}::uuid
      AND content_hash = ${params.contentHash}
      AND posted_at > NOW() - INTERVAL '5 minutes'
    `;

    const isDuplicate = Number(rows[0]?.count || 0) > 0;

    logger.debug({
      operation: "checkDuplicateResponse",
      threadId: params.threadId,
      isDuplicate,
      message: "Duplicate response check completed",
    });

    return ok(isDuplicate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "checkDuplicateResponse",
      error,
      message: `Database error while checking duplicate response: ${message}`,
    });
    return err(
      new DatabaseError(
        `重複チェック中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
