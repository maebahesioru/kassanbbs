import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNgWord,
  type ReadNgWord,
} from "../domain/read/ReadNgWord";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getNgWordsRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<ReadNgWord[], DatabaseError>> => {
  logger.debug({
    operation: "getNgWords",
    message: "Fetching NG words from database",
  });

  try {
    const result = await sql<{ id: string; word: string }[]>`
      SELECT id, word FROM ng_words ORDER BY created_at DESC
    `;

    if (!result) {
      logger.error({
        operation: "getNgWords",
        message: "Failed to retrieve NG words, no result from database",
      });
      return err(new DatabaseError("NGワードの取得に失敗しました"));
    }

    const ngWords: ReadNgWord[] = [];
    for (const row of result) {
      const ngWordResult = createReadNgWord({ id: row.id, word: row.word });
      if (ngWordResult.isErr()) {
        logger.error({
          operation: "getNgWords",
          error: ngWordResult.error,
          message: "Failed to create ReadNgWord from database row",
        });
        return err(ngWordResult.error);
      }
      ngWords.push(ngWordResult.value);
    }

    logger.info({
      operation: "getNgWords",
      count: ngWords.length,
      message: "NG words retrieved successfully",
    });

    return ok(ngWords);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getNgWords",
      error,
      message: `Database error while retrieving NG words: ${message}`,
    });
    return err(
      new DatabaseError(
        `NGワードの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
