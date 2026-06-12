import { err, ok } from "neverthrow";

import { getAdminGroupsRepository } from "../repositories/getAdminGroupsRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const verifyCapPasswordUsecase = async (
  vakContext: VakContext,
  password: string
): Promise<Result<{ valid: boolean; displayName?: string }, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "verifyCapPassword",
    message: "Verifying cap password",
  });

  const groupsResult = await getAdminGroupsRepository(vakContext);
  if (groupsResult.isErr()) {
    logger.error({
      operation: "verifyCapPassword",
      error: groupsResult.error,
      message: "Failed to retrieve admin groups",
    });
    return err(groupsResult.error);
  }

  for (const group of groupsResult.value) {
    if (group.groupName === password) {
      logger.info({
        operation: "verifyCapPassword",
        groupName: group.groupName,
        message: "Cap password matched admin group",
      });
      return ok({ valid: true, displayName: group.groupName });
    }
  }

  logger.warn({
    operation: "verifyCapPassword",
    message: "Cap password verification failed",
  });

  return ok({ valid: false });
};
