import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { getCaptchaConfigRepository } from "../repositories/getCaptchaConfigRepository";
import { verifyTurnstileToken } from "../services/turnstileService";
import { verifyRecaptchaToken } from "../services/recaptchaService";
import { verifyHcaptchaToken } from "../services/hcaptchaService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const verifyCaptchaUsecase = async (
  vakContext: VakContext,
  captchaToken: string | null
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "verifyCaptcha",
    hasToken: captchaToken !== null,
    message: "Starting captcha verification",
  });

  logger.debug({
    operation: "verifyCaptcha",
    message: "Fetching captcha configuration",
  });

  const configResult = await getCaptchaConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "verifyCaptcha",
      error: configResult.error,
      message: "Failed to fetch captcha configuration",
    });
    return err(configResult.error);
  }

  const { captchaProvider, captchaSecretKey } = configResult.value.val;

  if (!captchaProvider || captchaProvider === "none") {
    logger.info({
      operation: "verifyCaptcha",
      message: "Captcha is disabled, skipping verification",
    });
    return ok(true);
  }

  const supportedProviders = ["turnstile", "recaptcha", "hcaptcha"];
  if (!supportedProviders.includes(captchaProvider)) {
    logger.warn({
      operation: "verifyCaptcha",
      captchaProvider,
      message: "Unknown captcha provider, skipping verification",
    });
    return ok(true);
  }

  if (!captchaToken) {
    logger.warn({
      operation: "verifyCaptcha",
      message: "Captcha token is missing",
    });
    return err(new ValidationError("キャプチャ認証に失敗しました"));
  }

  logger.debug({
    operation: "verifyCaptcha",
    captchaProvider,
    message: `Verifying ${captchaProvider} token`,
  });

  let isValid = false;
  if (captchaProvider === "turnstile") {
    isValid = await verifyTurnstileToken(captchaToken, captchaSecretKey);
  } else if (captchaProvider === "recaptcha") {
    isValid = await verifyRecaptchaToken(captchaToken, captchaSecretKey);
  } else if (captchaProvider === "hcaptcha") {
    isValid = await verifyHcaptchaToken(captchaToken, captchaSecretKey);
  }

  if (!isValid) {
    logger.warn({
      operation: "verifyCaptcha",
      captchaProvider,
      message: `${captchaProvider} token verification failed`,
    });
    return err(new ValidationError("キャプチャ認証に失敗しました"));
  }

  logger.info({
    operation: "verifyCaptcha",
    message: "Captcha verification passed",
  });

  return ok(true);
};
