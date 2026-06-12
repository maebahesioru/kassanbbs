import { err, ok } from "neverthrow";

import { getAdminUserByUsernameRepository } from "../../admin/repositories/getAdminUserByUsernameRepository";
import { getUserGroupsRepository } from "../repositories/getUserGroupsRepository";
import { getAdminGroupsRepository } from "../repositories/getAdminGroupsRepository";
import { hasCapPermission, buildBitmask } from "../services/permissionService";

import type { VakContext } from "../../shared/types/VakContext";
import type { CapPermissionValue } from "../services/permissionService";
import type { Result } from "neverthrow";

export const checkRegulationBypassUsecase = async (
  vakContext: VakContext,
  params: { username: string; permissionType: CapPermissionValue }
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkRegulationBypass",
    username: params.username,
    permissionType: params.permissionType,
    message: "Checking regulation bypass permission",
  });

  const userResult = await getAdminUserByUsernameRepository(
    vakContext,
    params.username
  );
  if (userResult.isErr()) {
    logger.error({
      operation: "checkRegulationBypass",
      error: userResult.error,
      username: params.username,
      message: "Failed to retrieve admin user for regulation bypass check",
    });
    return err(userResult.error);
  }

  const user = userResult.value;
  if (!user) {
    logger.info({
      operation: "checkRegulationBypass",
      username: params.username,
      message: "Admin user not found, regulation bypass denied",
    });
    return ok(false);
  }

  if (user.isSuperAdmin) {
    logger.info({
      operation: "checkRegulationBypass",
      username: params.username,
      permissionType: params.permissionType,
      message: "User is super admin, regulation bypass granted",
    });
    return ok(true);
  }

  const userGroupsResult = await getUserGroupsRepository(vakContext, user.id);
  if (userGroupsResult.isErr()) {
    logger.error({
      operation: "checkRegulationBypass",
      error: userGroupsResult.error,
      username: params.username,
      message: "Failed to retrieve user groups for regulation bypass check",
    });
    return err(userGroupsResult.error);
  }

  const userGroups = userGroupsResult.value;
  if (userGroups.length === 0) {
    logger.info({
      operation: "checkRegulationBypass",
      username: params.username,
      message: "User has no groups, regulation bypass denied",
    });
    return ok(false);
  }

  const groupsResult = await getAdminGroupsRepository(vakContext);
  if (groupsResult.isErr()) {
    logger.error({
      operation: "checkRegulationBypass",
      error: groupsResult.error,
      username: params.username,
      message: "Failed to retrieve admin groups for regulation bypass check",
    });
    return err(groupsResult.error);
  }

  const userGroupIds = new Set(userGroups.map((g) => g.groupId));
  let combinedBitmask = 0;

  for (const group of groupsResult.value) {
    if (userGroupIds.has(group.id)) {
      combinedBitmask |= group.permissionBitmask;
    }
  }

  const result = hasCapPermission(combinedBitmask, params.permissionType);

  logger.info({
    operation: "checkRegulationBypass",
    username: params.username,
    permissionType: params.permissionType,
    granted: result,
    combinedBitmask,
    message: "Regulation bypass check completed",
  });

  return ok(result);
};
