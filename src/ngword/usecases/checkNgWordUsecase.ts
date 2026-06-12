import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { getNgWordsRepository } from "../repositories/getNgWordsRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkNgWordUsecase = async (
  vakContext: VakContext,
  texts: string[]
): Promise<Result<boolean, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkNgWord",
    message: "Checking NG words",
  });

  const ngWordsResult = await getNgWordsRepository(vakContext);
  if (ngWordsResult.isErr()) return err(ngWordsResult.error);

  const ngWords = ngWordsResult.value;
  const combinedText = texts.join(" ").toLowerCase();

  for (const ngWord of ngWords) {
    if (combinedText.includes(ngWord.word.toLowerCase())) {
      return err(
        new ValidationError(`NGワード「${ngWord.word}」が含まれています`)
      );
    }
  }

  return ok(true);
};
