import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteExpiredThreadsRepository = async (
  { sql, logger }: VakContext,
  config: {
    deleteAfterDays: number;
    onlyIfStopped: boolean;
    onlyIfNoResponsesDays: number;
  }
): Promise<Result<number, DatabaseError>> => {
  logger.info({
    operation: "deleteExpiredThreads",
    deleteAfterDays: config.deleteAfterDays,
    onlyIfStopped: config.onlyIfStopped,
    onlyIfNoResponsesDays: config.onlyIfNoResponsesDays,
    message: "Starting expired thread deletion",
  });

  try {
    const result = await sql.begin(async (tx) => {
      let conditionSql: string;
      if (config.onlyIfStopped && config.onlyIfNoResponsesDays > 0) {
        conditionSql = `
          WHERE
            (t.auto_delete_at IS NOT NULL AND t.auto_delete_at < NOW())
            OR (
              t.is_stopped = TRUE
              AND t.updated_at < NOW() - INTERVAL '${config.deleteAfterDays} days'
              AND (
                SELECT COUNT(*) FROM responses r WHERE r.thread_id = t.id
              ) = 0
              OR (
                t.updated_at < NOW() - INTERVAL '${config.deleteAfterDays} days'
                AND NOT EXISTS (
                  SELECT 1 FROM responses r
                  WHERE r.thread_id = t.id
                  AND r.posted_at > NOW() - INTERVAL '${config.onlyIfNoResponsesDays} days'
                )
              )
            )
        `;
      } else if (config.onlyIfStopped) {
        conditionSql = `
          WHERE
            (t.auto_delete_at IS NOT NULL AND t.auto_delete_at < NOW())
            OR (
              t.is_stopped = TRUE
              AND t.updated_at < NOW() - INTERVAL '${config.deleteAfterDays} days'
            )
        `;
      } else if (config.onlyIfNoResponsesDays > 0) {
        conditionSql = `
          WHERE
            (t.auto_delete_at IS NOT NULL AND t.auto_delete_at < NOW())
            OR (
              t.updated_at < NOW() - INTERVAL '${config.deleteAfterDays} days'
              AND (
                SELECT COUNT(*) FROM responses r WHERE r.thread_id = t.id
              ) = 0
              OR NOT EXISTS (
                SELECT 1 FROM responses r
                WHERE r.thread_id = t.id
                AND r.posted_at > NOW() - INTERVAL '${config.onlyIfNoResponsesDays} days'
              )
            )
        `;
      } else {
        conditionSql = `
          WHERE
            (t.auto_delete_at IS NOT NULL AND t.auto_delete_at < NOW())
            OR t.updated_at < NOW() - INTERVAL '${config.deleteAfterDays} days'
        `;
      }

      await tx.unsafe(`
        DELETE FROM responses
        WHERE thread_id IN (
          SELECT t.id FROM threads t
          ${conditionSql}
        )
      `);

      const deleteResult = await tx.unsafe(`
        DELETE FROM threads t
        ${conditionSql}
      `);

      const deletedCount = deleteResult.count ?? 0;

      if (deletedCount > 0) {
        await tx`
          UPDATE auto_delete_config
          SET deleted_count = deleted_count + ${deletedCount}
          WHERE id = 1
        `;
      }

      return deletedCount;
    });

    logger.info({
      operation: "deleteExpiredThreads",
      deletedCount: result,
      message: "Expired thread deletion completed",
    });

    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteExpiredThreads",
      error,
      message: `Database error while deleting expired threads: ${message}`,
    });
    return err(
      new DatabaseError(`期限切れスレッドの削除中にエラーが発生しました: ${message}`, error)
    );
  }
};
