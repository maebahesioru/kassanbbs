import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getReferrerConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<string, DatabaseError>> => {
  logger.debug({
    operation: "getReferrerConfig",
    message: "Fetching referrer cushion configuration",
  });

  try {
    const result = await sql<{ referrer_cushion: string }[]>`
      SELECT referrer_cushion FROM config LIMIT 1
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getReferrerConfig",
        message:
          "Failed to retrieve referrer configuration, invalid database response",
      });
      return err(
        new DatabaseError("リファラクッション設定の取得に失敗しました")
      );
    }

    logger.debug({
      operation: "getReferrerConfig",
      hasCushion: result[0].referrer_cushion !== "",
      message: "Referrer cushion configuration retrieved successfully",
    });

    return ok(result[0].referrer_cushion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getReferrerConfig",
      error,
      message: `Database error while fetching referrer cushion: ${message}`,
    });
    return err(
      new DatabaseError(
        `リファラ設定取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
