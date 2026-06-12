import { err, ok } from "neverthrow";
import { searchThreadsAndResponsesRepository, type SearchResultItem, type SearchParams } from "../repositories/searchThreadsAndResponsesRepository";
import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const searchUsecase = async (
  vakContext: VakContext,
  params: SearchParams
): Promise<Result<{ items: SearchResultItem[]; total: number }, Error>> => {
  const { logger } = vakContext;
  logger.info({
    operation: "searchUsecase",
    keyword: params.keyword,
    searchType: params.searchType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    message: "Starting search",
  });

  if (!params.keyword || params.keyword.trim().length === 0) {
    return ok({ items: [], total: 0 });
  }

  logger.debug({
    operation: "searchUsecase",
    boardId: params.boardId,
    message: "Board context for search",
  });

  const result = await searchThreadsAndResponsesRepository(vakContext, params);
  if (result.isErr()) return err(result.error);

  return ok(result.value);
};
