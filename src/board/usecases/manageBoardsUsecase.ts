import { err, ok } from "neverthrow";

import { getBoardsRepository } from "../repositories/getBoardsRepository";
import { getBoardByKeyRepository } from "../repositories/getBoardByKeyRepository";
import { createBoardRepository } from "../repositories/createBoardRepository";
import { updateBoardRepository } from "../repositories/updateBoardRepository";
import { deleteBoardRepository } from "../repositories/deleteBoardRepository";
import { createWriteBoard } from "../domain/write/WriteBoard";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadBoard } from "../domain/read/ReadBoard";
import type { Result } from "neverthrow";

export const getBoardsUsecase = async (
  vakContext: VakContext,
  includeInactive = false
): Promise<Result<ReadBoard[], Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getBoards",
    includeInactive,
    message: "Retrieving boards list",
  });

  const result = await getBoardsRepository(vakContext, includeInactive);
  if (result.isErr()) {
    logger.error({
      operation: "getBoards",
      error: result.error,
      includeInactive,
      message: "Failed to retrieve boards list",
    });
    return result;
  }

  logger.info({
    operation: "getBoards",
    count: result.value.length,
    includeInactive,
    message: "Boards list retrieved successfully",
  });

  return result;
};

export const getBoardByKeyUsecase = async (
  vakContext: VakContext,
  boardKey: string
): Promise<Result<ReadBoard, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getBoardByKey",
    boardKey,
    message: "Retrieving board by key",
  });

  const result = await getBoardByKeyRepository(vakContext, { boardKey });
  if (result.isErr()) {
    logger.error({
      operation: "getBoardByKey",
      error: result.error,
      boardKey,
      message: "Failed to retrieve board",
    });
    return result;
  }

  logger.info({
    operation: "getBoardByKey",
    boardKey,
    boardName: result.value.boardName,
    message: "Board retrieved successfully",
  });

  return result;
};

export const getDefaultBoardUsecase = async (
  vakContext: VakContext
): Promise<Result<ReadBoard, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "getDefaultBoard",
    message: "Retrieving default (first active) board",
  });

  const boardsResult = await getBoardsRepository(vakContext, false);
  if (boardsResult.isErr()) {
    logger.error({
      operation: "getDefaultBoard",
      error: boardsResult.error,
      message: "Failed to retrieve boards for default",
    });
    return err(boardsResult.error);
  }

  if (!boardsResult.value || boardsResult.value.length === 0) {
    logger.error({
      operation: "getDefaultBoard",
      message: "No active boards found",
    });
    return err(new Error("有効な板が見つかりません"));
  }

  const defaultBoard = boardsResult.value[0];

  logger.info({
    operation: "getDefaultBoard",
    boardKey: defaultBoard.boardKey,
    boardName: defaultBoard.boardName,
    message: "Default board selected",
  });

  return ok(defaultBoard);
};

export const createBoardUsecase = async (
  vakContext: VakContext,
  params: {
    boardKey: string;
    boardName: string;
    subtitle: string;
    localRule: string;
    nanashiName: string;
    category: string;
    sortOrder: number;
  }
): Promise<Result<ReadBoard, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "createBoard",
    boardKey: params.boardKey,
    boardName: params.boardName,
    message: "Creating new board",
  });

  const boardResult = createWriteBoard(params);
  if (boardResult.isErr()) {
    logger.error({
      operation: "createBoard",
      error: boardResult.error,
      message: "Failed to create board domain object",
    });
    return err(boardResult.error);
  }

  const result = await createBoardRepository(vakContext, boardResult.value);
  if (result.isErr()) {
    logger.error({
      operation: "createBoard",
      error: result.error,
      boardKey: params.boardKey,
      message: "Failed to create board in database",
    });
    return result;
  }

  logger.info({
    operation: "createBoard",
    id: result.value.id,
    boardKey: params.boardKey,
    message: "Board created successfully",
  });

  return result;
};

export const updateBoardUsecase = async (
  vakContext: VakContext,
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
): Promise<Result<ReadBoard, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "updateBoard",
    id: params.id,
    message: "Updating board",
  });

  const result = await updateBoardRepository(vakContext, params);
  if (result.isErr()) {
    logger.error({
      operation: "updateBoard",
      error: result.error,
      id: params.id,
      message: "Failed to update board",
    });
    return result;
  }

  logger.info({
    operation: "updateBoard",
    id: params.id,
    boardName: result.value.boardName,
    message: "Board updated successfully",
  });

  return result;
};

export const deleteBoardUsecase = async (
  vakContext: VakContext,
  id: string
): Promise<Result<void, Error>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "deleteBoard",
    id,
    message: "Deleting board",
  });

  const result = await deleteBoardRepository(vakContext, id);
  if (result.isErr()) {
    logger.error({
      operation: "deleteBoard",
      error: result.error,
      id,
      message: "Failed to delete board",
    });
    return result;
  }

  logger.info({
    operation: "deleteBoard",
    id,
    message: "Board deleted successfully",
  });

  return result;
};
