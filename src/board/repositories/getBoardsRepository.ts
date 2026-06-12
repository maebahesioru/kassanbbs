import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadBoard,
  type ReadBoard,
} from "../domain/read/ReadBoard";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getBoardsRepository = async (
  { sql, logger }: VakContext,
  includeInactive = false
): Promise<Result<ReadBoard[], DatabaseError>> => {
  logger.debug({
    operation: "getBoards",
    includeInactive,
    message: "Fetching boards from database",
  });

  try {
    const result = await sql<{
      id: string; board_key: string; board_name: string;
      subtitle: string; local_rule: string; nanashi_name: string;
      is_active: boolean; category: string; sort_order: number; created_at: Date;
    }[]>`
      SELECT id, board_key, board_name, subtitle, local_rule, nanashi_name, is_active, category, sort_order, created_at
      FROM boards
      ${includeInactive ? sql`` : sql`WHERE is_active = TRUE`}
      ORDER BY sort_order ASC, board_name ASC
    `;

    if (!result) {
      logger.error({
        operation: "getBoards",
        message: "Failed to retrieve boards, no result from database",
      });
      return err(new DatabaseError("板一覧の取得に失敗しました"));
    }

    const boards: ReadBoard[] = [];
    for (const row of result) {
      const boardResult = createReadBoard({
        id: row.id,
        boardKey: row.board_key,
        boardName: row.board_name,
        subtitle: row.subtitle,
        localRule: row.local_rule,
        nanashiName: row.nanashi_name,
        isActive: row.is_active,
        category: row.category,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
      });
      if (boardResult.isErr()) {
        logger.error({
          operation: "getBoards",
          error: boardResult.error,
          message: "Failed to create ReadBoard from database row",
        });
        return err(boardResult.error);
      }
      boards.push(boardResult.value);
    }

    logger.info({
      operation: "getBoards",
      count: boards.length,
      message: "Boards retrieved successfully",
    });

    return ok(boards);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getBoards",
      error,
      message: `Database error while retrieving boards: ${message}`,
    });
    return err(
      new DatabaseError(
        `板一覧の取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
