import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createReadBoard,
  type ReadBoard,
} from "../domain/read/ReadBoard";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateBoardRepository = async (
  { sql, logger }: VakContext,
  params: {
    id: string;
    boardKey?: string;
    boardName?: string;
    subtitle?: string;
    localRule?: string;
    nanashiName?: string;
    isActive?: boolean;
    category?: string;
    sortOrder?: number;
  }
): Promise<Result<ReadBoard, DatabaseError | DataNotFoundError>> => {
  logger.debug({
    operation: "updateBoard",
    id: params.id,
    message: "Updating board in database",
  });

  try {
    const sets: string[] = [];
    const values: (string | number | boolean)[] = [params.id];
    let idx = 2;

    if (params.boardKey !== undefined) { sets.push(`board_key = $${idx++}`); values.push(params.boardKey); }
    if (params.boardName !== undefined) { sets.push(`board_name = $${idx++}`); values.push(params.boardName); }
    if (params.subtitle !== undefined) { sets.push(`subtitle = $${idx++}`); values.push(params.subtitle); }
    if (params.localRule !== undefined) { sets.push(`local_rule = $${idx++}`); values.push(params.localRule); }
    if (params.nanashiName !== undefined) { sets.push(`nanashi_name = $${idx++}`); values.push(params.nanashiName); }
    if (params.isActive !== undefined) { sets.push(`is_active = $${idx++}`); values.push(params.isActive); }
    if (params.category !== undefined) { sets.push(`category = $${idx++}`); values.push(params.category); }
    if (params.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); values.push(params.sortOrder); }

    if (sets.length === 0) {
      return err(new DatabaseError("更新する項目がありません"));
    }

    const result = await sql.unsafe(`
      UPDATE boards SET ${sets.join(", ")}
      WHERE id = $1::uuid
      RETURNING id, board_key, board_name, subtitle, local_rule, nanashi_name, is_active, category, sort_order, created_at
    `, values);

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateBoard",
        id: params.id,
        message: "Board not found for update",
      });
      return err(new DataNotFoundError("板が見つかりません"));
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
        operation: "updateBoard",
        error: boardResult.error,
        message: "Failed to create ReadBoard from updated result",
      });
      return err(boardResult.error);
    }

    logger.info({
      operation: "updateBoard",
      id: params.id,
      boardKey: boardResult.value.boardKey,
      message: "Board updated successfully",
    });

    return ok(boardResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateBoard",
      id: params.id,
      error,
      message: `Database error while updating board: ${message}`,
    });
    return err(
      new DatabaseError(
        `板の更新中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
