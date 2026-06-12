import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type AutoDeleteConfig = {
  enabled: boolean;
  deleteAfterDays: number;
  onlyIfStopped: boolean;
  onlyIfNoResponsesDays: number;
  deletedCount: number;
};

export const getAutoDeleteConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<AutoDeleteConfig, DatabaseError>> => {
  logger.debug({
    operation: "getAutoDeleteConfig",
    message: "Fetching auto-delete configuration from database",
  });

  try {
    const result = await sql<
      {
        enabled: boolean;
        delete_after_days: number;
        only_if_stopped: boolean;
        only_if_no_responses_days: number;
        deleted_count: number;
      }[]
    >`
      SELECT
        enabled,
        delete_after_days,
        only_if_stopped,
        only_if_no_responses_days,
        deleted_count
      FROM
        auto_delete_config
      WHERE
        id = 1
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getAutoDeleteConfig",
        message: "Failed to retrieve auto-delete configuration, invalid database response",
      });
      return err(new DatabaseError("自動削除設定の取得に失敗しました"));
    }

    logger.info({
      operation: "getAutoDeleteConfig",
      enabled: result[0].enabled,
      deleteAfterDays: result[0].delete_after_days,
      message: "Auto-delete configuration retrieved successfully",
    });

    return ok({
      enabled: result[0].enabled,
      deleteAfterDays: result[0].delete_after_days,
      onlyIfStopped: result[0].only_if_stopped,
      onlyIfNoResponsesDays: result[0].only_if_no_responses_days,
      deletedCount: result[0].deleted_count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getAutoDeleteConfig",
      error,
      message: `Database error while retrieving auto-delete configuration: ${message}`,
    });
    return err(
      new DatabaseError(`自動削除設定の取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
