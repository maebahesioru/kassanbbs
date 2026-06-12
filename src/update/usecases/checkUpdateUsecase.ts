import { err, ok } from "neverthrow";

import { checkForUpdates } from "../services/updateCheckService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type UpdateCheckResult = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseUrl: string;
};

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const checkUpdateUsecase = async ({
  sql,
  logger,
}: VakContext): Promise<Result<{
  result: UpdateCheckResult | null;
  checkedAt: Date;
} | null, Error>> => {
  logger.info({
    operation: "checkUpdate",
    message: "Checking for updates",
  });

  try {
    const configRows = await sql<{ last_update_check: Date | null; update_available: string | null }[]>`
      SELECT last_update_check, update_available FROM config LIMIT 1
    `;
    const configRow = configRows?.[0];
    const lastCheck = configRow?.last_update_check ? new Date(configRow.last_update_check) : null;

    if (lastCheck && (Date.now() - lastCheck.getTime()) < CHECK_INTERVAL_MS) {
      const cached = configRow?.update_available;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as UpdateCheckResult;
          return ok({ result: parsed, checkedAt: lastCheck });
        } catch {
          // invalid cache, proceed with check
        }
      }
    }

    const result = await checkForUpdates();
    if (result.isErr()) {
      logger.error({
        operation: "checkUpdate",
        error: result.error,
        message: "Failed to check for updates",
      });
      return err(result.error);
    }

    const checkedAt = new Date();

    if (result.value) {
      await sql`
        UPDATE config SET last_update_check = ${checkedAt}, update_available = ${JSON.stringify(result.value)}
      `;
    } else {
      await sql`
        UPDATE config SET last_update_check = ${checkedAt}, update_available = NULL
      `;
    }

    logger.info({
      operation: "checkUpdate",
      hasUpdate: result.value?.hasUpdate ?? false,
      latestVersion: result.value?.latestVersion ?? "N/A",
      message: "Update check completed",
    });

    return ok(result.value ? { result: result.value, checkedAt } : null);
  } catch (error) {
    logger.error({
      operation: "checkUpdate",
      error,
      message: "Update check failed",
    });
    return err(error instanceof Error ? error : new Error("アップデートチェックに失敗しました"));
  }
};
