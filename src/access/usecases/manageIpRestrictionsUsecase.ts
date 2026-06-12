import { getIpRestrictionsRepository } from "../repositories/getIpRestrictionsRepository";
import { addIpRestrictionRepository } from "../repositories/addIpRestrictionRepository";
import { deleteIpRestrictionRepository } from "../repositories/deleteIpRestrictionRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { IpRestriction } from "../repositories/getIpRestrictionsRepository";
import type { Result } from "neverthrow";

export const getIpRestrictionsListUsecase = async (
  vakContext: VakContext
): Promise<Result<IpRestriction[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getIpRestrictionsList",
    message: "Retrieving IP restrictions list",
  });

  const result = await getIpRestrictionsRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getIpRestrictionsList",
      error: result.error,
      message: "Failed to retrieve IP restrictions list",
    });
    return result;
  }

  logger.info({
    operation: "getIpRestrictionsList",
    count: result.value.length,
    message: "IP restrictions list retrieved successfully",
  });

  return result;
};

export const addIpRestrictionUsecase = async (
  vakContext: VakContext,
  params: { ipOrCidr: string; restrictionType: "deny" | "allow"; note: string }
): Promise<Result<IpRestriction, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "addIpRestriction",
    params,
    message: "Adding new IP restriction",
  });

  const result = await addIpRestrictionRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "addIpRestriction",
      error: result.error,
      params,
      message: "Failed to add IP restriction",
    });
    return result;
  }

  logger.info({
    operation: "addIpRestriction",
    id: result.value.id,
    params,
    message: "IP restriction added successfully",
  });

  return result;
};

export const deleteIpRestrictionUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteIpRestriction",
    id,
    message: "Deleting IP restriction",
  });

  const result = await deleteIpRestrictionRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteIpRestriction",
      error: result.error,
      id,
      message: "Failed to delete IP restriction",
    });
    return result;
  }

  logger.info({
    operation: "deleteIpRestriction",
    id,
    message: "IP restriction deleted successfully",
  });

  return result;
};
