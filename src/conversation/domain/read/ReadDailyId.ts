import type { Nominal } from "../../../shared/types/Nominal";

export type ReadDailyId = Nominal<string, "ReadDailyId">;

export const generateDailyId = (
  hashId: string,
  threadId: string,
  date: Date
): ReadDailyId => {
  const dateStr = date.toISOString().split("T")[0];
  const combined = `${hashId}:${threadId}:${dateStr}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  const id = Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
  return id as ReadDailyId;
};
