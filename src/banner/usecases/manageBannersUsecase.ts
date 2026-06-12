import { getBannersRepository } from "../repositories/getBannersRepository";
import { createBannerRepository } from "../repositories/createBannerRepository";
import { updateBannerRepository } from "../repositories/updateBannerRepository";
import { deleteBannerRepository } from "../repositories/deleteBannerRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadBanner } from "../domain/read/ReadBanner";
import type { Result } from "neverthrow";

export const getBannersUsecase = async (
  vakContext: VakContext,
  includeInactive = false
): Promise<Result<ReadBanner[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getBanners",
    includeInactive,
    message: "Retrieving banners list",
  });

  const result = await getBannersRepository(vakContext, includeInactive);
  if (result.isErr()) {
    logger.error({
      operation: "getBanners",
      error: result.error,
      includeInactive,
      message: "Failed to retrieve banners list",
    });
    return result;
  }

  logger.info({
    operation: "getBanners",
    count: result.value.length,
    includeInactive,
    message: "Banners list retrieved successfully",
  });

  return result;
};

export const createBannerUsecase = async (
  vakContext: VakContext,
  params: { name: string; imageUrl: string; linkUrl: string; position: number }
): Promise<Result<ReadBanner, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "createBanner",
    name: params.name,
    message: "Creating new banner",
  });

  const result = await createBannerRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "createBanner",
      error: result.error,
      name: params.name,
      message: "Failed to create banner",
    });
    return result;
  }

  logger.info({
    operation: "createBanner",
    id: result.value.id,
    name: params.name,
    message: "Banner created successfully",
  });

  return result;
};

export const updateBannerUsecase = async (
  vakContext: VakContext,
  params: {
    id: string;
    name: string;
    imageUrl: string;
    linkUrl: string;
    position: number;
    isActive: boolean;
  }
): Promise<Result<ReadBanner, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateBanner",
    id: params.id,
    message: "Updating banner",
  });

  const result = await updateBannerRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "updateBanner",
      error: result.error,
      id: params.id,
      message: "Failed to update banner",
    });
    return result;
  }

  logger.info({
    operation: "updateBanner",
    id: params.id,
    message: "Banner updated successfully",
  });

  return result;
};

export const deleteBannerUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteBanner",
    id,
    message: "Deleting banner",
  });

  const result = await deleteBannerRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteBanner",
      error: result.error,
      id,
      message: "Failed to delete banner",
    });
    return result;
  }

  logger.info({
    operation: "deleteBanner",
    id,
    message: "Banner deleted successfully",
  });

  return result;
};
