import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkThreadCreationRateRepository = async (
  { sql, logger }: VakContext,
  params: {
    hostIdentifier: string;
    hourLimit: number;
    closeLimit: number;
    closeMinutes: number;
  }
): Promise<
  Result<{ hourlyCount: number; closeCount: number; allowed: boolean }, DatabaseError>
> => {
  logger.debug({
    operation: "checkThreadCreationRate",
    hostIdentifier: params.hostIdentifier,
    hourLimit: params.hourLimit,
    closeLimit: params.closeLimit,
    closeMinutes: params.closeMinutes,
    message: "Checking thread creation rate limits",
  });

  try {
    const closeMinutesAgo = new Date(
      Date.now() - params.closeMinutes * 60 * 1000
    );
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await sql<
      {
        hourly_count: number;
        close_count: number;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${oneHourAgo.toISOString()}::timestamptz)::int as hourly_count,
        COUNT(*) FILTER (WHERE created_at >= ${closeMinutesAgo.toISOString()}::timestamptz)::int as close_count
      FROM admin_logs
      WHERE log_type = 'THR'
        AND ip_address = ${params.hostIdentifier}
    `;

    if (!result || result.length === 0) {
      logger.debug({
        operation: "checkThreadCreationRate",
        hostIdentifier: params.hostIdentifier,
        message: "No thread creation logs found for host",
      });
      return ok({ hourlyCount: 0, closeCount: 0, allowed: true });
    }

    const hourlyCount = result[0].hourly_count;
    const closeCount = result[0].close_count;
    const allowed =
      hourlyCount < params.hourLimit && closeCount < params.closeLimit;

    logger.info({
      operation: "checkThreadCreationRate",
      hostIdentifier: params.hostIdentifier,
      hourlyCount,
      closeCount,
      allowed,
      message: "Thread creation rate check completed",
    });

    return ok({ hourlyCount, closeCount, allowed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "checkThreadCreationRate",
      error,
      message: `Database error while checking thread creation rate: ${message}`,
    });
    return err(
      new DatabaseError(`スレッド作成レート制限の確認に失敗しました: ${message}`, error)
    );
  }
};
