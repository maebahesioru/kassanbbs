import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type ReadNinpochoRecord = {
  readonly _type: "ReadNinpochoRecord";
  readonly val: {
    id: string;
    hashId: string;
    ipAddress: string;
    errorCount: number;
    banLevel: number;
    banUntil: Date | null;
    lastErrorAt: Date | null;
    firstSeenAt: Date;
    createdAt: Date;
    xp: number;
    gold: number;
  };
};

export const createReadNinpochoRecord = ({
  id,
  hashId,
  ipAddress,
  errorCount,
  banLevel,
  banUntil,
  lastErrorAt,
  firstSeenAt,
  createdAt,
  xp,
  gold,
}: {
  id: string;
  hashId: string;
  ipAddress: string;
  errorCount: number;
  banLevel: number;
  banUntil: Date | null;
  lastErrorAt: Date | null;
  firstSeenAt: Date;
  createdAt: Date;
  xp: number;
  gold: number;
}): Result<ReadNinpochoRecord, Error> => {
  return ok({
    _type: "ReadNinpochoRecord",
    val: {
      id,
      hashId,
      ipAddress,
      errorCount,
      banLevel,
      banUntil,
      lastErrorAt,
      firstSeenAt,
      createdAt,
      xp,
      gold,
    },
  });
};
