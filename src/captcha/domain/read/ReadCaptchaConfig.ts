import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type ReadCaptchaConfig = {
  readonly _type: "ReadCaptchaConfig";
  readonly val: {
    captchaProvider: string;
    captchaSiteKey: string;
    captchaSecretKey: string;
  };
};

export const createReadCaptchaConfig = ({
  captchaProvider,
  captchaSiteKey,
  captchaSecretKey,
}: {
  captchaProvider: string;
  captchaSiteKey: string;
  captchaSecretKey: string;
}): Result<ReadCaptchaConfig, Error> => {
  return ok({
    _type: "ReadCaptchaConfig",
    val: {
      captchaProvider,
      captchaSiteKey,
      captchaSecretKey,
    },
  });
};
