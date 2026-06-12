import { getNgWordsRepository } from "../repositories/getNgWordsRepository";
import { addNgWordRepository } from "../repositories/addNgWordRepository";
import { deleteNgWordRepository } from "../repositories/deleteNgWordRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadNgWord } from "../domain/read/ReadNgWord";
import type { Result } from "neverthrow";

export const getNgWordsListUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadNgWord[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getNgWordsList",
    message: "Retrieving NG words list",
  });

  const result = await getNgWordsRepository(vakContext);
  if (result.isErr()) {
    logger.error({
      operation: "getNgWordsList",
      error: result.error,
      message: "Failed to retrieve NG words list",
    });
    return result;
  }

  logger.info({
    operation: "getNgWordsList",
    count: result.value.length,
    message: "NG words list retrieved successfully",
  });

  return result;
};

export const addNgWordUsecase = async (
  vakContext: VakContext,
  word: string
): Promise<Result<ReadNgWord, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "addNgWord",
    word,
    message: "Adding new NG word",
  });

  const result = await addNgWordRepository(vakContext, word);
  if (result.isErr()) {
    logger.error({
      operation: "addNgWord",
      error: result.error,
      word,
      message: "Failed to add NG word",
    });
    return result;
  }

  logger.info({
    operation: "addNgWord",
    id: result.value.id,
    word,
    message: "NG word added successfully",
  });

  return result;
};

export const deleteNgWordUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteNgWord",
    id,
    message: "Deleting NG word",
  });

  const result = await deleteNgWordRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteNgWord",
      error: result.error,
      id,
      message: "Failed to delete NG word",
    });
    return result;
  }

  logger.info({
    operation: "deleteNgWord",
    id,
    message: "NG word deleted successfully",
  });

  return result;
};
