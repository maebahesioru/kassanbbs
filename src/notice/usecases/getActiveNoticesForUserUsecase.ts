import { err, ok } from "neverthrow";

import { getNoticesRepository } from "../repositories/getNoticesRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadNotice } from "../domain/read/ReadNotice";
import type { Result } from "neverthrow";

export const getActiveNoticesForUserUsecase = async (
  vakContext: VakContext,
  params: {
    ip: string;
    host: string;
    hashId: string;
  }
): Promise<Result<ReadNotice[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getActiveNoticesForUser",
    message: "Retrieving active notices for user",
  });

  const result = await getNoticesRepository(vakContext, false);
  if (result.isErr()) {
    logger.error({
      operation: "getActiveNoticesForUser",
      error: result.error,
      message: "Failed to retrieve notices",
    });
    return result;
  }

  const filtered = result.value.filter((notice) => {
    if (notice.targetType === "all") return true;
    if (notice.targetType === "ip" && notice.targetValue === params.ip) return true;
    if (notice.targetType === "host" && notice.targetValue === params.host) return true;
    if (notice.targetType === "hash_id" && notice.targetValue === params.hashId) return true;
    return false;
  });

  logger.info({
    operation: "getActiveNoticesForUser",
    count: filtered.length,
    message: "Active notices for user retrieved successfully",
  });

  return ok(filtered);
};
