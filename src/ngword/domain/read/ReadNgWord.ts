import { ok, err, type Result } from "neverthrow";
import { ValidationError } from "../../../shared/types/Error";
import type { Nominal } from "../../../shared/types/Nominal";

export type ReadNgWordId = Nominal<string, "ReadNgWordId">;
export type ReadNgWordWord = Nominal<string, "ReadNgWordWord">;

export type ReadNgWord = {
  readonly _type: "ReadNgWord";
  readonly id: ReadNgWordId;
  readonly word: ReadNgWordWord;
};

export const createReadNgWordId = (
  value: string
): Result<ReadNgWordId, ValidationError> => {
  if (!value || value.length === 0)
    return err(new ValidationError("NGワードIDが不正です"));
  return ok(value as ReadNgWordId);
};

export const createReadNgWordWord = (
  value: string
): Result<ReadNgWordWord, ValidationError> => {
  if (!value || value.trim().length === 0)
    return err(new ValidationError("NGワードが空です"));
  return ok(value.trim() as ReadNgWordWord);
};

export const createReadNgWord = (params: {
  id: string;
  word: string;
}): Result<ReadNgWord, ValidationError> => {
  const idResult = createReadNgWordId(params.id);
  if (idResult.isErr()) return err(idResult.error);
  const wordResult = createReadNgWordWord(params.word);
  if (wordResult.isErr()) return err(wordResult.error);
  return ok({ _type: "ReadNgWord", id: idResult.value, word: wordResult.value });
};
