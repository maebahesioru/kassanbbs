import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type ReadNinpochoConfig = {
  readonly _type: "ReadNinpochoConfig";
  readonly val: {
    enabled: boolean;
    errorThreshold1: number;
    banDuration1Hours: number;
    errorThreshold2: number;
    banDuration2Hours: number;
    errorThreshold3: number;
    banDuration3Hours: number;
    permanentBanThreshold: number;
    errorDecayHours: number;
    forceSageLevel: number;
    forceKoteName: string;
    maxLevel: number;
    xpPerPost: number;
    xpPerLevel: number;
  };
};

export const createReadNinpochoConfig = ({
  enabled,
  errorThreshold1,
  banDuration1Hours,
  errorThreshold2,
  banDuration2Hours,
  errorThreshold3,
  banDuration3Hours,
  permanentBanThreshold,
  errorDecayHours,
  forceSageLevel,
  forceKoteName,
  maxLevel,
  xpPerPost,
  xpPerLevel,
}: {
  enabled: boolean;
  errorThreshold1: number;
  banDuration1Hours: number;
  errorThreshold2: number;
  banDuration2Hours: number;
  errorThreshold3: number;
  banDuration3Hours: number;
  permanentBanThreshold: number;
  errorDecayHours: number;
  forceSageLevel: number;
  forceKoteName: string;
  maxLevel: number;
  xpPerPost: number;
  xpPerLevel: number;
}): Result<ReadNinpochoConfig, Error> => {
  return ok({
    _type: "ReadNinpochoConfig",
    val: {
      enabled,
      errorThreshold1,
      banDuration1Hours,
      errorThreshold2,
      banDuration2Hours,
      errorThreshold3,
      banDuration3Hours,
      permanentBanThreshold,
      errorDecayHours,
      forceSageLevel,
      forceKoteName,
      maxLevel,
      xpPerPost,
      xpPerLevel,
    },
  });
};
