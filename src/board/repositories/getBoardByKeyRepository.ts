import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createReadBoard,
  type ReadBoard,
} from "../domain/read/ReadBoard";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getBoardByKeyRepository = async (
  { sql, logger }: VakContext,
  { boardKey }: { boardKey: string }
): Promise<Result<ReadBoard, DatabaseError | DataNotFoundError>> => {
  logger.debug({
    operation: "getBoardByKey",
    boardKey,
    message: "Fetching board by key from database",
  });

  try {
    const result = await sql<{
      id: string; board_key: string; board_name: string;
      subtitle: string; local_rule: string; nanashi_name: string;
      is_active: boolean; category: string; sort_order: number; created_at: Date;
    }[]>`
      SELECT id, board_key, board_name, subtitle, local_rule, nanashi_name, is_active, category, sort_order, created_at
      FROM boards
      WHERE board_key = ${boardKey}
      LIMIT 1
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getBoardByKey",
        boardKey,
        message: "Board not found for given key",
      });
      return err(new DataNotFoundError(`板キー "${boardKey}" が見つかりません`));
    }

    const boardResult = createReadBoard({
      id: result[0].id,
      boardKey: result[0].board_key,
      boardName: result[0].board_name,
      subtitle: result[0].subtitle,
      localRule: result[0].local_rule,
      nanashiName: result[0].nanashi_name,
      isActive: result[0].is_active,
      category: result[0].category,
      sortOrder: result[0].sort_order,
      createdAt: new Date(result[0].created_at),
    });
    if (boardResult.isErr()) {
      logger.error({
        operation: "getBoardByKey",
        error: boardResult.error,
        boardKey,
        message: "Failed to create ReadBoard from database result",
      });
      return err(boardResult.error);
    }

    logger.info({
      operation: "getBoardByKey",
      boardKey,
      boardName: boardResult.value.boardName,
      message: "Board retrieved successfully",
    });

    return ok(boardResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getBoardByKey",
      boardKey,
      error,
      message: `Database error while retrieving board: ${message}`,
    });
    return err(
      new DatabaseError(
        `板の取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
