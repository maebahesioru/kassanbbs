import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createReadCaptchaConfig,
  type ReadCaptchaConfig,
} from "../domain/read/ReadCaptchaConfig";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getCaptchaConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<ReadCaptchaConfig, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getCaptchaConfig",
    message: "Fetching captcha configuration from database",
  });

  try {
    const result = await sql<
      {
        captcha_provider: string;
        captcha_site_key: string;
        captcha_secret_key: string;
      }[]
    >`
        SELECT captcha_provider, captcha_site_key, captcha_secret_key FROM config LIMIT 1
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getCaptchaConfig",
        message:
          "Failed to retrieve captcha configuration, invalid database response",
      });
      return err(new DataNotFoundError("設定の取得に失敗しました"));
    }

    logger.debug({
      operation: "getCaptchaConfig",
      captchaProvider: result[0].captcha_provider,
      message: "Captcha configuration retrieved from database",
    });

    const captchaConfigResult = createReadCaptchaConfig({
      captchaProvider: result[0].captcha_provider,
      captchaSiteKey: result[0].captcha_site_key,
      captchaSecretKey: result[0].captcha_secret_key,
    });

    if (captchaConfigResult.isErr()) {
      logger.error({
        operation: "getCaptchaConfig",
        error: captchaConfigResult.error,
        message: "Invalid captcha configuration format",
      });
      return err(captchaConfigResult.error);
    }

    logger.info({
      operation: "getCaptchaConfig",
      captchaProvider: result[0].captcha_provider,
      message: "Captcha configuration retrieved and validated successfully",
    });

    return ok(captchaConfigResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getCaptchaConfig",
      error,
      message: `Database error while fetching captcha configuration: ${message}`,
    });
    return err(
      new DatabaseError(`設定取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
