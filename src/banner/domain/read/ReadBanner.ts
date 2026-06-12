import { ok, err, type Result } from "neverthrow";
import { ValidationError } from "../../../shared/types/Error";
import type { Nominal } from "../../../shared/types/Nominal";

export type ReadBannerId = Nominal<string, "ReadBannerId">;
export type ReadBannerName = Nominal<string, "ReadBannerName">;
export type ReadBannerImageUrl = Nominal<string, "ReadBannerImageUrl">;
export type ReadBannerLinkUrl = Nominal<string, "ReadBannerLinkUrl">;

export type ReadBanner = {
  readonly _type: "ReadBanner";
  readonly id: ReadBannerId;
  readonly name: ReadBannerName;
  readonly imageUrl: ReadBannerImageUrl;
  readonly linkUrl: ReadBannerLinkUrl;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
};

export const createReadBannerId = (
  value: string
): Result<ReadBannerId, ValidationError> => {
  if (!value || value.length === 0)
    return err(new ValidationError("バナーIDが不正です"));
  return ok(value as ReadBannerId);
};

export const createReadBannerName = (
  value: string
): Result<ReadBannerName, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("バナー名が空です"));
  return ok(value.trim() as ReadBannerName);
};

export const createReadBannerImageUrl = (
  value: string
): Result<ReadBannerImageUrl, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("画像URLが空です"));
  return ok(value.trim() as ReadBannerImageUrl);
};

export const createReadBannerLinkUrl = (
  value: string
): Result<ReadBannerLinkUrl, ValidationError> => {
  return ok((value || "") as ReadBannerLinkUrl);
};

export const createReadBanner = (params: {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
}): Result<ReadBanner, ValidationError> => {
  const idResult = createReadBannerId(params.id);
  if (idResult.isErr()) return err(idResult.error);
  const nameResult = createReadBannerName(params.name);
  if (nameResult.isErr()) return err(nameResult.error);
  const imageUrlResult = createReadBannerImageUrl(params.imageUrl);
  if (imageUrlResult.isErr()) return err(imageUrlResult.error);
  const linkUrlResult = createReadBannerLinkUrl(params.linkUrl);
  if (linkUrlResult.isErr()) return err(linkUrlResult.error);
  return ok({
    _type: "ReadBanner" as const,
    id: idResult.value,
    name: nameResult.value,
    imageUrl: imageUrlResult.value,
    linkUrl: linkUrlResult.value,
    position: params.position,
    isActive: params.isActive,
    createdAt: params.createdAt,
  });
};
