import { ok, err, type Result } from "neverthrow";

import { ValidationError } from "../../../shared/types/Error";

import type { ReadMail } from "../read/ReadMail";

// メールアドレス
export type WriteMail = {
  readonly _type: "WriteMail";
  readonly val: string;
};

// https://zenn.dev/igz0/articles/email-validation-regex-best-practices
const regexMail =
  /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const commandValues = [
  "sage",
  "age",
  "!markdown",
  "!force774",
  "!ninja",
  "!othello",
  "!down",
  "down",
  "!bottom",
  "bottom",
];

const isCommandValue = (value: string): boolean => {
  const lower = value.toLowerCase().trim();
  if (commandValues.includes(lower)) return true;
  if (lower.startsWith("font")) return true;
  if (/^!?up:\d+$/.test(lower)) return true;
  if (/^!?down:\d+$/.test(lower)) return true;
  return false;
};

export const createWriteMail = (
  value: string | null
): Result<WriteMail, ValidationError> => {
  if (value === null) {
    return ok({ _type: "WriteMail", val: "" });
  }
  if (value.length > 255) {
    return err(new ValidationError("メールアドレスは255文字以内です"));
  }
  // 簡単なメールアドレス形式チェック (厳密なものではない)
  if (
    value !== "" &&
    !isCommandValue(value) &&
    !regexMail.test(value)
  ) {
    return err(new ValidationError("不正なメールアドレス形式です"));
  }
  return ok({ _type: "WriteMail", val: value });
};

// メールアドレスの内容がsageかどうかを判定する関数
export const isSage = (mail: WriteMail | ReadMail): boolean => {
  return mail.val.toLowerCase() === "sage";
};
