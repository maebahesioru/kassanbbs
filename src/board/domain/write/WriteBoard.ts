import { ok, err, type Result } from "neverthrow";
import { uuidv7 } from "uuidv7";
import { ValidationError } from "../../../shared/types/Error";

export type WriteBoardId = string & { readonly _type: "WriteBoardId" };
export type WriteBoardKey = string & { readonly _type: "WriteBoardKey" };
export type WriteBoardName = string & { readonly _type: "WriteBoardName" };

export type WriteBoard = {
  readonly _type: "WriteBoard";
  readonly id: WriteBoardId;
  readonly boardKey: WriteBoardKey;
  readonly boardName: WriteBoardName;
  readonly subtitle: string;
  readonly localRule: string;
  readonly nanashiName: string;
  readonly category: string;
  readonly sortOrder: number;
};

export const createWriteBoardId = (): WriteBoardId => {
  return uuidv7() as WriteBoardId;
};

export const createWriteBoardKey = (
  value: string
): Result<WriteBoardKey, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("板キーが空です"));
  return ok(value.trim() as WriteBoardKey);
};

export const createWriteBoardName = (
  value: string
): Result<WriteBoardName, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("板名が空です"));
  return ok(value.trim() as WriteBoardName);
};

export const createWriteBoard = (params: {
  boardKey: string;
  boardName: string;
  subtitle: string;
  localRule: string;
  nanashiName: string;
  category: string;
  sortOrder: number;
}): Result<WriteBoard, ValidationError> => {
  const keyResult = createWriteBoardKey(params.boardKey);
  if (keyResult.isErr()) return err(keyResult.error);
  const nameResult = createWriteBoardName(params.boardName);
  if (nameResult.isErr()) return err(nameResult.error);

  const subtitle = params.subtitle.trim();
  if (subtitle.length > 200)
    return err(new ValidationError("サブタイトルは200文字以内で入力してください"));

  const localRule = params.localRule.trim();
  if (localRule.length > 1000)
    return err(new ValidationError("ローカルルールは1000文字以内で入力してください"));

  const nanashiName = params.nanashiName.trim() || "名無しさん";
  if (nanashiName.length > 100)
    return err(new ValidationError("名無しさん名は100文字以内で入力してください"));

  const category = params.category.trim();
  if (category.length > 50)
    return err(new ValidationError("カテゴリは50文字以内で入力してください"));

  const sortOrder = params.sortOrder;
  if (!Number.isInteger(sortOrder) || sortOrder < 0)
    return err(new ValidationError("ソート順は0以上の整数で入力してください"));

  return ok({
    _type: "WriteBoard" as const,
    id: createWriteBoardId(),
    boardKey: keyResult.value,
    boardName: nameResult.value,
    subtitle,
    localRule,
    nanashiName,
    category,
    sortOrder,
  });
};
