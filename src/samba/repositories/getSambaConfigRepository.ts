import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createReadSambaConfig,
  type ReadSambaConfig,
} from "../domain/read/ReadSambaConfig";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getSambaConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<ReadSambaConfig, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getSambaConfig",
    message: "Fetching samba configuration from database",
  });

  try {
    const result = await sql<
      {
        enabled: boolean;
        caution_threshold: number;
        warning_threshold: number;
        listed_threshold: number;
        ban_duration_hours: number;
        live_mode_multiplier: number;
        violation_decay_hours: number;
      }[]
    >`
      SELECT
        enabled,
        caution_threshold,
        warning_threshold,
        listed_threshold,
        ban_duration_hours,
        live_mode_multiplier,
        violation_decay_hours
      FROM samba_config LIMIT 1
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getSambaConfig",
        message:
          "Failed to retrieve samba configuration, invalid database response",
      });
      return err(new DataNotFoundError("サンバ設定の取得に失敗しました"));
    }

    logger.debug({
      operation: "getSambaConfig",
      enabled: result[0].enabled,
      message: "Samba configuration retrieved from database",
    });

    const configResult = createReadSambaConfig({
      enabled: result[0].enabled,
      cautionThreshold: result[0].caution_threshold,
      warningThreshold: result[0].warning_threshold,
      listedThreshold: result[0].listed_threshold,
      banDurationHours: result[0].ban_duration_hours,
      liveModeMultiplier: result[0].live_mode_multiplier,
      violationDecayHours: result[0].violation_decay_hours,
    });

    if (configResult.isErr()) {
      logger.error({
        operation: "getSambaConfig",
        error: configResult.error,
        message: "Invalid samba configuration format",
      });
      return err(configResult.error);
    }

    logger.info({
      operation: "getSambaConfig",
      enabled: result[0].enabled,
      message: "Samba configuration retrieved and validated successfully",
    });

    return ok(configResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getSambaConfig",
      error,
      message: `Database error while fetching samba configuration: ${message}`,
    });
    return err(
      new DatabaseError(`サンバ設定取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
