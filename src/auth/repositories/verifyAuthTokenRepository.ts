import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const verifyAuthTokenRepository = async (
  { sql, logger }: VakContext,
  { token, ipAddress }: { token: string; ipAddress: string }
): Promise<Result<boolean, DatabaseError>> => {
  logger.debug({
    operation: "verifyAuthToken",
    message: "Verifying auth token",
  });

  try {
    const result = await sql<{ id: string }[]>`
      UPDATE auth_tokens SET used = TRUE
      WHERE id = (
        SELECT id FROM auth_tokens
        WHERE token = ${token} AND used = FALSE
        AND expires_at > NOW() AND ip_address = ${ipAddress}
        LIMIT 1
      ) RETURNING id
    `;

    if (!result || result.length === 0) {
      logger.warn({
        operation: "verifyAuthToken",
        message: "Auth token not found, expired, already used, or IP mismatch",
      });
      return ok(false);
    }

    logger.info({
      operation: "verifyAuthToken",
      message: "Auth token verified and marked as used",
    });

    return ok(true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "verifyAuthToken",
      error,
      message: `Database error while verifying auth token: ${message}`,
    });
    return err(
      new DatabaseError(`認証トークン検証中にエラーが発生しました: ${message}`, error)
    );
  }
};
