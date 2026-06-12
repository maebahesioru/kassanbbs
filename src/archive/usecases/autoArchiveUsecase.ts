import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const autoArchiveUsecase = async (
  { sql, logger }: VakContext,
  daysThreshold: number = 30
): Promise<Result<number, DatabaseError>> => {
  logger.info({
    operation: "autoArchiveUsecase",
    daysThreshold,
    message: "Starting auto-archive process",
  });

  try {
    const result = await sql<
      { id: string }[]
    >`
      UPDATE
        threads
      SET
        is_stopped = TRUE,
        is_pooled = TRUE
      WHERE
        updated_at < NOW() - ${daysThreshold} * INTERVAL '1 day'
        AND is_stopped = FALSE
      RETURNING id
    `;

    const archivedCount = result.length;

    logger.info({
      operation: "autoArchiveUsecase",
      archivedCount,
      daysThreshold,
      message: "Auto-archive process completed",
    });

    return ok(archivedCount);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "autoArchiveUsecase",
      error,
      daysThreshold,
      message: `Database error during auto-archive: ${message}`,
    });
    return err(
      new DatabaseError(`自動アーカイブ処理中にエラーが発生しました: ${message}`, error)
    );
  }
};
