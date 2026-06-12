import { err, ok } from "neverthrow";

import { getAdminUserByUsernameRepository } from "../../admin/repositories/getAdminUserByUsernameRepository";
import { getUserGroupsRepository } from "../repositories/getUserGroupsRepository";
import { getAdminGroupsRepository } from "../repositories/getAdminGroupsRepository";
import { hasCapPermission, buildBitmask } from "../services/permissionService";

import type { VakContext } from "../../shared/types/VakContext";
import type { CapPermissionValue } from "../services/permissionService";
import type { Result } from "neverthrow";

export const checkPermissionUsecase = async (
  vakContext: VakContext,
  params: { username: string; requiredPermission: CapPermissionValue }
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkPermission",
    username: params.username,
    requiredPermission: params.requiredPermission,
    message: "Checking user permission",
  });

  const userResult = await getAdminUserByUsernameRepository(
    vakContext,
    params.username
  );
  if (userResult.isErr()) {
    logger.error({
      operation: "checkPermission",
      error: userResult.error,
      username: params.username,
      message: "Failed to retrieve admin user",
    });
    return err(userResult.error);
  }

  const user = userResult.value;
  if (!user) {
    logger.warn({
      operation: "checkPermission",
      username: params.username,
      message: "Admin user not found",
    });
    return ok(false);
  }

  if (user.isSuperAdmin) {
    logger.info({
      operation: "checkPermission",
      username: params.username,
      message: "User is super admin, all permissions granted",
    });
    return ok(true);
  }

  const userGroupsResult = await getUserGroupsRepository(vakContext, user.id);
  if (userGroupsResult.isErr()) {
    logger.error({
      operation: "checkPermission",
      error: userGroupsResult.error,
      username: params.username,
      message: "Failed to retrieve user groups",
    });
    return err(userGroupsResult.error);
  }

  const userGroups = userGroupsResult.value;
  if (userGroups.length === 0) {
    logger.info({
      operation: "checkPermission",
      username: params.username,
      message: "User has no groups, permission denied",
    });
    return ok(false);
  }

  const groupsResult = await getAdminGroupsRepository(vakContext);
  if (groupsResult.isErr()) {
    logger.error({
      operation: "checkPermission",
      error: groupsResult.error,
      username: params.username,
      message: "Failed to retrieve admin groups",
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

  const result = hasCapPermission(combinedBitmask, params.requiredPermission);

  logger.info({
    operation: "checkPermission",
    username: params.username,
    requiredPermission: params.requiredPermission,
    granted: result,
    combinedBitmask,
    message: "Permission check completed",
  });

  return ok(result);
};
