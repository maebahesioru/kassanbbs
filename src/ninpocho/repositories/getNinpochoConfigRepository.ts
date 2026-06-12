import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createReadNinpochoConfig,
  type ReadNinpochoConfig,
} from "../domain/read/ReadNinpochoConfig";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getNinpochoConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<ReadNinpochoConfig, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getNinpochoConfig",
    message: "Fetching ninpocho configuration from database",
  });

  try {
    const result = await sql<
      {
        enabled: boolean;
        error_threshold_1: number;
        ban_duration_1_hours: number;
        error_threshold_2: number;
        ban_duration_2_hours: number;
        error_threshold_3: number;
        ban_duration_3_hours: number;
        permanent_ban_threshold: number;
        error_decay_hours: number;
        force_sage_level: number;
        force_kote_name: string;
        max_level: number;
        xp_per_post: number;
        xp_per_level: number;
      }[]
    >`
      SELECT
        enabled,
        error_threshold_1,
        ban_duration_1_hours,
        error_threshold_2,
        ban_duration_2_hours,
        error_threshold_3,
        ban_duration_3_hours,
        permanent_ban_threshold,
        error_decay_hours,
        force_sage_level,
        force_kote_name,
        max_level,
        xp_per_post,
        xp_per_level
      FROM ninpocho_config LIMIT 1
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getNinpochoConfig",
        message:
          "Failed to retrieve ninpocho configuration, invalid database response",
      });
      return err(new DataNotFoundError("忍法帖設定の取得に失敗しました"));
    }

    logger.debug({
      operation: "getNinpochoConfig",
      enabled: result[0].enabled,
      message: "Ninpocho configuration retrieved from database",
    });

    const configResult = createReadNinpochoConfig({
      enabled: result[0].enabled,
      errorThreshold1: result[0].error_threshold_1,
      banDuration1Hours: result[0].ban_duration_1_hours,
      errorThreshold2: result[0].error_threshold_2,
      banDuration2Hours: result[0].ban_duration_2_hours,
      errorThreshold3: result[0].error_threshold_3,
      banDuration3Hours: result[0].ban_duration_3_hours,
      permanentBanThreshold: result[0].permanent_ban_threshold,
      errorDecayHours: result[0].error_decay_hours,
      forceSageLevel: result[0].force_sage_level,
      forceKoteName: result[0].force_kote_name,
      maxLevel: result[0].max_level,
      xpPerPost: result[0].xp_per_post,
      xpPerLevel: result[0].xp_per_level,
    });

    if (configResult.isErr()) {
      logger.error({
        operation: "getNinpochoConfig",
        error: configResult.error,
        message: "Invalid ninpocho configuration format",
      });
      return err(configResult.error);
    }

    logger.info({
      operation: "getNinpochoConfig",
      enabled: result[0].enabled,
      message:
        "Ninpocho configuration retrieved and validated successfully",
    });

    return ok(configResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getNinpochoConfig",
      error,
      message: `Database error while fetching ninpocho configuration: ${message}`,
    });
    return err(
      new DatabaseError(`忍法帖設定取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
