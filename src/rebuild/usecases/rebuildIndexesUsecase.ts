import { err, ok } from "neverthrow";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const rebuildIndexesUsecase = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<{ threadsChecked: number; responsesChecked: number; issues: string[] }, Error>
> => {
  const issues: string[] = [];

  logger.info({
    operation: "rebuildIndexes",
    message: "Starting data integrity check",
  });

  try {
    const orphanedResponses = await sql<
      { id: string; thread_id: string; response_number: number }[]
    >`
      SELECT r.id, r.thread_id, r.response_number FROM responses r
      LEFT JOIN threads t ON r.thread_id = t.id
      WHERE t.id IS NULL
    `;
    if (orphanedResponses.length > 0) {
      issues.push(`Found ${orphanedResponses.length} orphaned responses`);
      logger.warn({
        operation: "rebuildIndexes",
        orphanedCount: orphanedResponses.length,
        message: "Found orphaned responses",
      });
    }

    const threadsResult = await sql<{ count: number }[]>`
      SELECT COUNT(*) as count FROM threads
    `;
    const responsesResult = await sql<{ count: number }[]>`
      SELECT COUNT(*) as count FROM responses
    `;

    const threadsChecked = Number(threadsResult[0].count);
    const responsesChecked = Number(responsesResult[0].count);

    const threads = await sql<{ id: string }[]>`
      SELECT id FROM threads ORDER BY id
    `;
    for (const thread of threads) {
      const resCountResult = await sql<{ count: number }[]>`
        SELECT COUNT(*) as count FROM responses WHERE thread_id = ${thread.id}::uuid
      `;
      if (Number(resCountResult[0].count) === 0) {
        issues.push(`Thread ${thread.id} has no responses`);
      }
    }

    logger.info({
      operation: "rebuildIndexes",
      threadsChecked,
      responsesChecked,
      issueCount: issues.length,
      message: "Data integrity check completed",
    });

    return ok({ threadsChecked, responsesChecked, issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "rebuildIndexes",
      error,
      message: `Error during data integrity check: ${message}`,
    });
    return err(new Error(`データ整合性チェック中にエラーが発生しました: ${message}`));
  }
};

export const fixOrphanedResponsesUsecase = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<{ deletedCount: number }, Error>
> => {
  logger.info({
    operation: "fixOrphanedResponses",
    message: "Starting orphaned response cleanup",
  });

  try {
    const result = await sql`
      DELETE FROM responses
      WHERE id IN (
        SELECT r.id FROM responses r
        LEFT JOIN threads t ON r.thread_id = t.id
        WHERE t.id IS NULL
      )
    `;

    const deletedCount = result ? result.length : 0;

    logger.info({
      operation: "fixOrphanedResponses",
      deletedCount,
      message: "Orphaned responses cleaned up",
    });

    return ok({ deletedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "fixOrphanedResponses",
      error,
      message: `Error during orphaned response cleanup: ${message}`,
    });
    return err(new Error(`孤児レスポンスの削除中にエラーが発生しました: ${message}`));
  }
};
