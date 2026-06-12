import { verifyBeLogin } from "../services/beService";

import type { Result } from "neverthrow";

export const beLoginUsecase = async (
  beId: string,
  password: string
): Promise<Result<boolean, Error>> => {
  const result = await verifyBeLogin(beId, password);
  return result;
};
