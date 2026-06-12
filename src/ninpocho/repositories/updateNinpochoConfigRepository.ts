import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateNinpochoConfigRepository = async (
  { sql, logger }: VakContext,
  params: {
    enabled?: boolean;
    errorThreshold1?: number;
    banDuration1Hours?: number;
    errorThreshold2?: number;
    banDuration2Hours?: number;
    errorThreshold3?: number;
    banDuration3Hours?: number;
    permanentBanThreshold?: number;
    errorDecayHours?: number;
    forceSageLevel?: number;
    forceKoteName?: string;
    maxLevel?: number;
    xpPerPost?: number;
    xpPerLevel?: number;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateNinpochoConfig",
    enabled: params.enabled,
    message: "Updating ninpocho configuration in database",
  });

  try {
    await sql`
      UPDATE ninpocho_config SET
        enabled = COALESCE(${params.enabled ?? null}, enabled),
        error_threshold_1 = COALESCE(${params.errorThreshold1 ?? null}, error_threshold_1),
        ban_duration_1_hours = COALESCE(${params.banDuration1Hours ?? null}, ban_duration_1_hours),
        error_threshold_2 = COALESCE(${params.errorThreshold2 ?? null}, error_threshold_2),
        ban_duration_2_hours = COALESCE(${params.banDuration2Hours ?? null}, ban_duration_2_hours),
        error_threshold_3 = COALESCE(${params.errorThreshold3 ?? null}, error_threshold_3),
        ban_duration_3_hours = COALESCE(${params.banDuration3Hours ?? null}, ban_duration_3_hours),
        permanent_ban_threshold = COALESCE(${params.permanentBanThreshold ?? null}, permanent_ban_threshold),
        error_decay_hours = COALESCE(${params.errorDecayHours ?? null}, error_decay_hours),
        force_sage_level = COALESCE(${params.forceSageLevel ?? null}, force_sage_level),
        force_kote_name = COALESCE(${params.forceKoteName ?? null}, force_kote_name),
        max_level = COALESCE(${params.maxLevel ?? null}, max_level),
        xp_per_post = COALESCE(${params.xpPerPost ?? null}, xp_per_post),
        xp_per_level = COALESCE(${params.xpPerLevel ?? null}, xp_per_level)
      WHERE id = 1
    `;

    logger.info({
      operation: "updateNinpochoConfig",
      message: "Ninpocho configuration updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateNinpochoConfig",
      error,
      message: `Database error while updating ninpocho configuration: ${message}`,
    });
    return err(
      new DatabaseError(`忍法帖設定更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
