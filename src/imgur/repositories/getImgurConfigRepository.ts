import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export interface ImgurOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}

export const getImgurConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<{ clientId: string }, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getImgurConfig",
    message: "Fetching Imgur client ID from environment",
  });

  try {
    const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID;

    if (!clientId) {
      logger.warn({
        operation: "getImgurConfig",
        message: "Imgur client ID not configured",
      });
      return err(new DataNotFoundError("ImgurクライアントIDが設定されていません"));
    }

    logger.info({
      operation: "getImgurConfig",
      message: "Imgur client ID retrieved successfully",
    });

    return ok({ clientId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getImgurConfig",
      error,
      message: `Error while fetching Imgur config: ${message}`,
    });
    return err(new DatabaseError(`Imgur設定の取得中にエラーが発生しました: ${message}`, error));
  }
};

export const getImgurOAuthConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<ImgurOAuthConfig, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getImgurOAuthConfig",
    message: "Fetching Imgur OAuth config",
  });

  try {
    const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_IMGUR_CLIENT_SECRET;
    const redirectUri = import.meta.env.VITE_IMGUR_REDIRECT_URI ?? "http://localhost:5173/admin/imgur/callback";

    if (!clientId || !clientSecret) {
      logger.warn({
        operation: "getImgurOAuthConfig",
        message: "Imgur OAuth not fully configured",
      });
      return err(new DataNotFoundError("Imgur OAuth設定が不完全です"));
    }

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let tokenExpiry: Date | null = null;

    try {
      const result = await sql<{ key: string; value: string }[]>`
        SELECT key, value FROM app_settings WHERE key IN ('imgur_access_token', 'imgur_refresh_token', 'imgur_token_expiry')
      `;
      for (const row of result) {
        if (row.key === "imgur_access_token") accessToken = row.value;
        if (row.key === "imgur_refresh_token") refreshToken = row.value;
        if (row.key === "imgur_token_expiry") tokenExpiry = new Date(row.value);
      }
    } catch {
      accessToken = import.meta.env.VITE_IMGUR_ACCESS_TOKEN ?? null;
      refreshToken = import.meta.env.VITE_IMGUR_REFRESH_TOKEN ?? null;
      const expiryStr = import.meta.env.VITE_IMGUR_TOKEN_EXPIRY;
      if (expiryStr) tokenExpiry = new Date(expiryStr);
    }

    logger.info({
      operation: "getImgurOAuthConfig",
      hasAccessToken: accessToken !== null,
      hasRefreshToken: refreshToken !== null,
      hasTokenExpiry: tokenExpiry !== null,
      message: "Imgur OAuth config retrieved",
    });

    return ok({ clientId, clientSecret, redirectUri, accessToken, refreshToken, tokenExpiry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getImgurOAuthConfig",
      error,
      message: `Error fetching Imgur OAuth config: ${message}`,
    });
    return err(new DatabaseError(`Imgur OAuth設定の取得中にエラーが発生しました: ${message}`, error));
  }
};

export const saveImgurTokensRepository = async (
  { sql, logger }: VakContext,
  params: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "saveImgurTokens",
    message: "Saving Imgur OAuth tokens",
  });

  try {
    const rows = [
      { key: "imgur_access_token", value: params.accessToken },
      { key: "imgur_refresh_token", value: params.refreshToken },
      { key: "imgur_token_expiry", value: params.tokenExpiry.toISOString() },
    ];

    for (const row of rows) {
      await sql`
        INSERT INTO app_settings (key, value) VALUES (${row.key}, ${row.value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    logger.info({
      operation: "saveImgurTokens",
      message: "Imgur OAuth tokens saved successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "saveImgurTokens",
      error,
      message: `Error saving Imgur tokens: ${message}`,
    });
    return err(new DatabaseError(`Imgurトークンの保存中にエラーが発生しました: ${message}`, error));
  }
};
