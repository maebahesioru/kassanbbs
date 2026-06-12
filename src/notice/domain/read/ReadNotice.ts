import { ok, err, type Result } from "neverthrow";
import { ValidationError } from "../../../shared/types/Error";
import type { Nominal } from "../../../shared/types/Nominal";

export type ReadNoticeId = Nominal<string, "ReadNoticeId">;
export type ReadNoticeTitle = Nominal<string, "ReadNoticeTitle">;
export type ReadNoticeContent = Nominal<string, "ReadNoticeContent">;

export type ReadNotice = {
  readonly _type: "ReadNotice";
  readonly id: ReadNoticeId;
  readonly title: ReadNoticeTitle;
  readonly content: ReadNoticeContent;
  readonly targetType: string;
  readonly targetValue: string;
  readonly isActive: boolean;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
};

export const createReadNoticeId = (
  value: string
): Result<ReadNoticeId, ValidationError> => {
  if (!value || value.length === 0)
    return err(new ValidationError("通知IDが不正です"));
  return ok(value as ReadNoticeId);
};

export const createReadNoticeTitle = (
  value: string
): Result<ReadNoticeTitle, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("通知タイトルが空です"));
  return ok(value.trim() as ReadNoticeTitle);
};

export const createReadNoticeContent = (
  value: string
): Result<ReadNoticeContent, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("通知内容が空です"));
  return ok(value.trim() as ReadNoticeContent);
};

export const createReadNotice = (params: {
  id: string;
  title: string;
  content: string;
  targetType: string;
  targetValue: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}): Result<ReadNotice, ValidationError> => {
  const idResult = createReadNoticeId(params.id);
  if (idResult.isErr()) return err(idResult.error);
  const titleResult = createReadNoticeTitle(params.title);
  if (titleResult.isErr()) return err(titleResult.error);
  const contentResult = createReadNoticeContent(params.content);
  if (contentResult.isErr()) return err(contentResult.error);
  return ok({
    _type: "ReadNotice" as const,
    id: idResult.value,
    title: titleResult.value,
    content: contentResult.value,
    targetType: params.targetType,
    targetValue: params.targetValue,
    isActive: params.isActive,
    expiresAt: params.expiresAt,
    createdAt: params.createdAt,
  });
};
