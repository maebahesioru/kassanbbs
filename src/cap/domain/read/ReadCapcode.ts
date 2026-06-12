import type { Nominal } from "../../../shared/types/Nominal";

export type ReadCapcode = Nominal<string, "ReadCapcode">;

export const createCapcode = (
  username: string,
  trip: string | null
): ReadCapcode => {
  const base = trip ? `${username} ◆${trip.substring(0, 8)}` : username;
  return base as ReadCapcode;
};
