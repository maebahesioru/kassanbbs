import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkDuplicateTitleRepository = async (
  { sql, logger }: VakContext,
  title: string
): Promise<Result<boolean, DatabaseError>> => {
  logger.debug({
    operation: "checkDuplicateTitle",
    title,
    message: "Checking for duplicate thread title",
  });

  try {
    const normalized = title.trim().toLowerCase();
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*) as count FROM threads
      WHERE LOWER(TRIM(title)) = ${normalized}
      AND posted_at > NOW() - INTERVAL '24 hours'
    `;

    const isDuplicate = Number(rows[0]?.count || 0) > 0;

    logger.debug({
      operation: "checkDuplicateTitle",
      title,
      isDuplicate,
      message: "Duplicate title check completed",
    });

    return ok(isDuplicate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "checkDuplicateTitle",
      error,
      message: `Database error while checking duplicate title: ${message}`,
    });
    return err(
      new DatabaseError(
        `重複チェック中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
