import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type ReadSambaConfig = {
  readonly _type: "ReadSambaConfig";
  readonly val: {
    enabled: boolean;
    cautionThreshold: number;
    warningThreshold: number;
    listedThreshold: number;
    banDurationHours: number;
    liveModeMultiplier: number;
    violationDecayHours: number;
  };
};

export const createReadSambaConfig = ({
  enabled,
  cautionThreshold,
  warningThreshold,
  listedThreshold,
  banDurationHours,
  liveModeMultiplier,
  violationDecayHours,
}: {
  enabled: boolean;
  cautionThreshold: number;
  warningThreshold: number;
  listedThreshold: number;
  banDurationHours: number;
  liveModeMultiplier: number;
  violationDecayHours: number;
}): Result<ReadSambaConfig, Error> => {
  return ok({
    _type: "ReadSambaConfig",
    val: {
      enabled,
      cautionThreshold,
      warningThreshold,
      listedThreshold,
      banDurationHours,
      liveModeMultiplier,
      violationDecayHours,
    },
  });
};
