import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type SambaLevel = "none" | "caution" | "warning" | "listed" | "banned";

export type ReadSambaTracking = {
  readonly _type: "ReadSambaTracking";
  readonly val: {
    id: string;
    hostIdentifier: string;
    violationCount: number;
    currentLevel: SambaLevel;
    lastViolationAt: Date | null;
    banUntil: Date | null;
    createdAt: Date;
  };
};

export const createReadSambaTracking = ({
  id,
  hostIdentifier,
  violationCount,
  currentLevel,
  lastViolationAt,
  banUntil,
  createdAt,
}: {
  id: string;
  hostIdentifier: string;
  violationCount: number;
  currentLevel: SambaLevel;
  lastViolationAt: Date | null;
  banUntil: Date | null;
  createdAt: Date;
}): Result<ReadSambaTracking, Error> => {
  return ok({
    _type: "ReadSambaTracking",
    val: {
      id,
      hostIdentifier,
      violationCount,
      currentLevel,
      lastViolationAt,
      banUntil,
      createdAt,
    },
  });
};
