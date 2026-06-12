import { fetchBeProfile } from "../services/beService";

import type { BeProfile } from "../services/beService";
import type { Result } from "neverthrow";

export const fetchBeProfileUsecase = async (
  beId: string
): Promise<Result<BeProfile | null, Error>> => {
  const result = await fetchBeProfile(beId);
  return result;
};
