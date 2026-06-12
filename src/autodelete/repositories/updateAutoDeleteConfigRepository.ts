import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type UpdateAutoDeleteConfigData = {
  enabled: boolean;
  deleteAfterDays: number;
  onlyIfStopped: boolean;
  onlyIfNoResponsesDays: number;
};

export const updateAutoDeleteConfigRepository = async (
  { sql, logger }: VakContext,
  config: UpdateAutoDeleteConfigData
): Promise<Result<undefined, DatabaseError>> => {
  logger.debug({
    operation: "updateAutoDeleteConfig",
    enabled: config.enabled,
    deleteAfterDays: config.deleteAfterDays,
    onlyIfStopped: config.onlyIfStopped,
    onlyIfNoResponsesDays: config.onlyIfNoResponsesDays,
    message: "Updating auto-delete configuration in database",
  });

  try {
    await sql`
      UPDATE
        auto_delete_config
      SET
        enabled = ${config.enabled},
        delete_after_days = ${config.deleteAfterDays},
        only_if_stopped = ${config.onlyIfStopped},
        only_if_no_responses_days = ${config.onlyIfNoResponsesDays}
      WHERE
        id = 1
    `;

    logger.info({
      operation: "updateAutoDeleteConfig",
      message: "Auto-delete configuration updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateAutoDeleteConfig",
      error,
      message: `Database error while updating auto-delete configuration: ${message}`,
    });
    return err(
      new DatabaseError(`自動削除設定の更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
