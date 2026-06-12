import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNgWord,
  type ReadNgWord,
} from "../domain/read/ReadNgWord";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addNgWordRepository = async (
  { sql, logger }: VakContext,
  word: string
): Promise<Result<ReadNgWord, DatabaseError>> => {
  logger.debug({
    operation: "addNgWord",
    word,
    message: "Adding new NG word to database",
  });

  const id = uuidv7();

  try {
    const result = await sql<{ id: string }[]>`
      INSERT INTO ng_words(id, word) VALUES(${id}::uuid, ${word}) RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addNgWord",
        word,
        message: "Failed to add NG word, invalid database response",
      });
      return err(new DatabaseError("NGワードの追加に失敗しました"));
    }

    const ngWordResult = createReadNgWord({ id: result[0].id, word });
    if (ngWordResult.isErr()) {
      logger.error({
        operation: "addNgWord",
        error: ngWordResult.error,
        word,
        message: "Failed to create ReadNgWord from database result",
      });
      return err(ngWordResult.error);
    }

    logger.info({
      operation: "addNgWord",
      id: result[0].id,
      word,
      message: "NG word added successfully",
    });

    return ok(ngWordResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addNgWord",
      error,
      word,
      message: `Database error while adding NG word: ${message}`,
    });
    return err(
      new DatabaseError(
        `NGワードの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
