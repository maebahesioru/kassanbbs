import { getAdminUsersRepository } from "../repositories/getAdminUsersRepository";
import { getAdminUserByUsernameRepository } from "../repositories/getAdminUserByUsernameRepository";
import { createAdminUserRepository } from "../repositories/createAdminUserRepository";
import { deleteAdminUserRepository } from "../repositories/deleteAdminUserRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { AdminUser } from "../repositories/getAdminUsersRepository";
import type { AdminUserWithPassword } from "../repositories/getAdminUserByUsernameRepository";
import type { Result } from "neverthrow";

export const getAdminUsersUsecase = async (
  vakContext: VakContext
): Promise<Result<AdminUser[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getAdminUsers",
    message: "Retrieving admin users list",
  });

  const result = await getAdminUsersRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getAdminUsers",
      error: result.error,
      message: "Failed to retrieve admin users list",
    });
    return result;
  }

  logger.info({
    operation: "getAdminUsers",
    count: result.value.length,
    message: "Admin users list retrieved successfully",
  });

  return result;
};

export const getAdminUserByUsernameUsecase = async (
  vakContext: VakContext,
  username: string
): Promise<Result<AdminUserWithPassword | null, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getAdminUserByUsername",
    username,
    message: "Retrieving admin user by username",
  });

  const result = await getAdminUserByUsernameRepository(vakContext, username);
  if (result.isErr()) {
    logger.error({
      operation: "getAdminUserByUsername",
      error: result.error,
      username,
      message: "Failed to retrieve admin user",
    });
    return result;
  }

  logger.info({
    operation: "getAdminUserByUsername",
    username,
    found: result.value !== null,
    message: "Admin user lookup completed",
  });

  return result;
};

export const createAdminUserUsecase = async (
  vakContext: VakContext,
  params: {
    username: string;
    password: string;
    fullName: string;
    isSuperAdmin: boolean;
  }
): Promise<Result<AdminUser, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "createAdminUser",
    username: params.username,
    message: "Creating new admin user",
  });

  const result = await createAdminUserRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "createAdminUser",
      error: result.error,
      username: params.username,
      message: "Failed to create admin user",
    });
    return result;
  }

  logger.info({
    operation: "createAdminUser",
    id: result.value.id,
    username: params.username,
    message: "Admin user created successfully",
  });

  return result;
};

export const deleteAdminUserUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteAdminUser",
    id,
    message: "Deleting admin user",
  });

  const result = await deleteAdminUserRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteAdminUser",
      error: result.error,
      id,
      message: "Failed to delete admin user",
    });
    return result;
  }

  logger.info({
    operation: "deleteAdminUser",
    id,
    message: "Admin user deleted successfully",
  });

  return result;
};
