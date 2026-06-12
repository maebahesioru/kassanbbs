import { ok, err, type Result } from "neverthrow";
import { ValidationError } from "../../../shared/types/Error";
import type { Nominal } from "../../../shared/types/Nominal";

export type ReadBoardId = Nominal<string, "ReadBoardId">;
export type ReadBoardKey = Nominal<string, "ReadBoardKey">;
export type ReadBoardName = Nominal<string, "ReadBoardName">;

export type ReadBoard = {
  readonly _type: "ReadBoard";
  readonly id: ReadBoardId;
  readonly boardKey: ReadBoardKey;
  readonly boardName: ReadBoardName;
  readonly subtitle: string;
  readonly localRule: string;
  readonly nanashiName: string;
  readonly isActive: boolean;
  readonly category: string;
  readonly sortOrder: number;
  readonly createdAt: Date;
};

export const createReadBoardId = (
  value: string
): Result<ReadBoardId, ValidationError> => {
  if (!value || value.length === 0)
    return err(new ValidationError("板IDが不正です"));
  return ok(value as ReadBoardId);
};

export const createReadBoardKey = (
  value: string
): Result<ReadBoardKey, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("板キーが空です"));
  return ok(value.trim() as ReadBoardKey);
};

export const createReadBoardName = (
  value: string
): Result<ReadBoardName, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("板名が空です"));
  return ok(value.trim() as ReadBoardName);
};

export const createReadBoard = (params: {
  id: string;
  boardKey: string;
  boardName: string;
  subtitle: string;
  localRule: string;
  nanashiName: string;
  isActive: boolean;
  category: string;
  sortOrder: number;
  createdAt: Date;
}): Result<ReadBoard, ValidationError> => {
  const idResult = createReadBoardId(params.id);
  if (idResult.isErr()) return err(idResult.error);
  const keyResult = createReadBoardKey(params.boardKey);
  if (keyResult.isErr()) return err(keyResult.error);
  const nameResult = createReadBoardName(params.boardName);
  if (nameResult.isErr()) return err(nameResult.error);
  return ok({
    _type: "ReadBoard" as const,
    id: idResult.value,
    boardKey: keyResult.value,
    boardName: nameResult.value,
    subtitle: params.subtitle,
    localRule: params.localRule,
    nanashiName: params.nanashiName,
    isActive: params.isActive,
    category: params.category,
    sortOrder: params.sortOrder,
    createdAt: params.createdAt,
  });
};
