import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type ReadSpamConfig = {
  readonly _type: "ReadSpamConfig";
  readonly val: {
    enableSpamDetection: boolean;
    spamThreshold: number;
  };
};

export const createReadSpamConfig = ({
  enableSpamDetection,
  spamThreshold,
}: {
  enableSpamDetection: boolean;
  spamThreshold: number;
}): Result<ReadSpamConfig, Error> => {
  return ok({
    _type: "ReadSpamConfig",
    val: {
      enableSpamDetection,
      spamThreshold,
    },
  });
};
