import { ok, err, type Result } from "neverthrow";

import { ValidationError } from "../../../shared/types/Error";

import type { ReadMail } from "../read/ReadMail";

// X ID
export type WriteMail = {
  readonly _type: "WriteMail";
  readonly val: string;
};

const isXId = (value: string): boolean => /^@?[a-zA-Z0-9_]{1,30}$/.test(value);

export const createWriteMail = (
  value: string | null
): Result<WriteMail, ValidationError> => {
  if (value === null) {
    return ok({ _type: "WriteMail", val: "" });
  }
  if (value.length > 255) {
    return err(new ValidationError("X IDは255文字以内です"));
  }
  if (value !== "" && value.toLowerCase() !== "sage" && !isXId(value)) {
    return err(new ValidationError("X IDの形式が正しくありません"));
  }
  return ok({ _type: "WriteMail", val: value });
};

export const isSage = (mail: WriteMail | ReadMail): boolean => {
  return mail.val.toLowerCase() === "sage";
};
