import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadBoard,
  type ReadBoard,
} from "../domain/read/ReadBoard";
import type { WriteBoard } from "../domain/write/WriteBoard";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const createBoardRepository = async (
  { sql, logger }: VakContext,
  board: WriteBoard
): Promise<Result<ReadBoard, DatabaseError>> => {
  logger.debug({
    operation: "createBoard",
    boardKey: board.boardKey,
    boardName: board.boardName,
    message: "Creating new board in database",
  });

  try {
    const result = await sql<{
      id: string; board_key: string; board_name: string;
      subtitle: string; local_rule: string; nanashi_name: string;
      is_active: boolean; category: string; sort_order: number; created_at: Date;
    }[]>`
      INSERT INTO boards(id, board_key, board_name, subtitle, local_rule, nanashi_name, is_active, category, sort_order)
      VALUES(${board.id}::uuid, ${board.boardKey}, ${board.boardName}, ${board.subtitle}, ${board.localRule}, ${board.nanashiName}, TRUE, ${board.category}, ${board.sortOrder})
      RETURNING id, board_key, board_name, subtitle, local_rule, nanashi_name, is_active, category, sort_order, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "createBoard",
        boardKey: board.boardKey,
        message: "Failed to create board, invalid database response",
      });
      return err(new DatabaseError("板の作成に失敗しました"));
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
        operation: "createBoard",
        error: boardResult.error,
        message: "Failed to create ReadBoard from database result",
      });
      return err(boardResult.error);
    }

    logger.info({
      operation: "createBoard",
      id: result[0].id,
      boardKey: board.boardKey,
      boardName: board.boardName,
      message: "Board created successfully",
    });

    return ok(boardResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "createBoard",
      error,
      boardKey: board.boardKey,
      message: `Database error while creating board: ${message}`,
    });
    return err(
      new DatabaseError(
        `板の作成中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
