import { getAdminGroupsRepository } from "../repositories/getAdminGroupsRepository";
import { createAdminGroupRepository } from "../repositories/createAdminGroupRepository";
import { updateAdminGroupRepository } from "../repositories/updateAdminGroupRepository";
import { deleteAdminGroupRepository } from "../repositories/deleteAdminGroupRepository";
import { getUserGroupsRepository } from "../repositories/getUserGroupsRepository";
import { setUserGroupsRepository } from "../repositories/setUserGroupsRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { AdminGroup } from "../repositories/getAdminGroupsRepository";
import type { UserGroup } from "../repositories/getUserGroupsRepository";
import type { Result } from "neverthrow";

export const getAdminGroupsUsecase = async (
  vakContext: VakContext
): Promise<Result<AdminGroup[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getAdminGroups",
    message: "Retrieving admin groups list",
  });

  const result = await getAdminGroupsRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getAdminGroups",
      error: result.error,
      message: "Failed to retrieve admin groups list",
    });
    return result;
  }

  logger.info({
    operation: "getAdminGroups",
    count: result.value.length,
    message: "Admin groups list retrieved successfully",
  });

  return result;
};

export const createAdminGroupUsecase = async (
  vakContext: VakContext,
  params: {
    groupName: string;
    permissions: string;
  }
): Promise<Result<AdminGroup, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "createAdminGroup",
    groupName: params.groupName,
    message: "Creating new admin group",
  });

  const result = await createAdminGroupRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "createAdminGroup",
      error: result.error,
      groupName: params.groupName,
      message: "Failed to create admin group",
    });
    return result;
  }

  logger.info({
    operation: "createAdminGroup",
    id: result.value.id,
    groupName: params.groupName,
    message: "Admin group created successfully",
  });

  return result;
};

export const updateAdminGroupUsecase = async (
  vakContext: VakContext,
  params: {
    id: string;
    groupName: string;
    permissions: string;
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateAdminGroup",
    id: params.id,
    groupName: params.groupName,
    message: "Updating admin group",
  });

  const result = await updateAdminGroupRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "updateAdminGroup",
      error: result.error,
      id: params.id,
      message: "Failed to update admin group",
    });
    return result;
  }

  logger.info({
    operation: "updateAdminGroup",
    id: params.id,
    message: "Admin group updated successfully",
  });

  return result;
};

export const deleteAdminGroupUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteAdminGroup",
    id,
    message: "Deleting admin group",
  });

  const result = await deleteAdminGroupRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteAdminGroup",
      error: result.error,
      id,
      message: "Failed to delete admin group",
    });
    return result;
  }

  logger.info({
    operation: "deleteAdminGroup",
    id,
    message: "Admin group deleted successfully",
  });

  return result;
};

export const getUserGroupsUsecase = async (
  vakContext: VakContext,
  userId: string
): Promise<Result<UserGroup[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getUserGroups",
    userId,
    message: "Retrieving user groups",
  });

  const result = await getUserGroupsRepository(vakContext, userId);
  if (result.isErr()) {
    logger.error({
      operation: "getUserGroups",
      error: result.error,
      userId,
      message: "Failed to retrieve user groups",
    });
    return result;
  }

  logger.info({
    operation: "getUserGroups",
    userId,
    count: result.value.length,
    message: "User groups retrieved successfully",
  });

  return result;
};

export const setUserGroupsUsecase = async (
  vakContext: VakContext,
  params: {
    userId: string;
    groupIds: string[];
  }
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "setUserGroups",
    userId: params.userId,
    groupIds: params.groupIds,
    message: "Setting user groups",
  });

  const result = await setUserGroupsRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "setUserGroups",
      error: result.error,
      userId: params.userId,
      message: "Failed to set user groups",
    });
    return result;
  }

  logger.info({
    operation: "setUserGroups",
    userId: params.userId,
    message: "User groups set successfully",
  });

  return result;
};
