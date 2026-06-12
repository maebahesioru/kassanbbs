import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateSambaConfigRepository = async (
  { sql, logger }: VakContext,
  params: {
    enabled?: boolean;
    cautionThreshold?: number;
    warningThreshold?: number;
    listedThreshold?: number;
    banDurationHours?: number;
    liveModeMultiplier?: number;
    violationDecayHours?: number;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateSambaConfig",
    enabled: params.enabled,
    message: "Updating samba configuration in database",
  });

  try {
    await sql`
      UPDATE samba_config SET
        enabled = COALESCE(${params.enabled ?? null}, enabled),
        caution_threshold = COALESCE(${params.cautionThreshold ?? null}, caution_threshold),
        warning_threshold = COALESCE(${params.warningThreshold ?? null}, warning_threshold),
        listed_threshold = COALESCE(${params.listedThreshold ?? null}, listed_threshold),
        ban_duration_hours = COALESCE(${params.banDurationHours ?? null}, ban_duration_hours),
        live_mode_multiplier = COALESCE(${params.liveModeMultiplier ?? null}, live_mode_multiplier),
        violation_decay_hours = COALESCE(${params.violationDecayHours ?? null}, violation_decay_hours)
      WHERE id = 1
    `;

    logger.info({
      operation: "updateSambaConfig",
      message: "Samba configuration updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateSambaConfig",
      error,
      message: `Database error while updating samba configuration: ${message}`,
    });
    return err(
      new DatabaseError(`サンバ設定更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
