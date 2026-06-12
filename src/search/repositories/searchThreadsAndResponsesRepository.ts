import { err, ok } from "neverthrow";
import { DatabaseError } from "../../shared/types/Error";
import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type SearchResultItem = {
  type: "thread" | "response";
  threadId: string;
  threadTitle: string;
  responseNumber?: number;
  authorName?: string;
  content: string;
  postedAt: Date;
  hashId?: string;
};

export type SearchParams = {
  keyword: string;
  searchType?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  boardId?: string;
};

export const searchThreadsAndResponsesRepository = async (
  { sql, logger }: VakContext,
  params: SearchParams
): Promise<Result<{ items: SearchResultItem[]; total: number }, DatabaseError>> => {
  const { keyword, searchType = 15, dateFrom, dateTo, limit = 50, offset = 0, boardId } = params;
  logger.info({
    operation: "searchRepository",
    keyword,
    searchType,
    dateFrom,
    dateTo,
    message: "Searching threads and responses",
  });

  try {
    const escaped = keyword.replace(/[%_\\]/g, '\\$&');
    const searchPattern = `%${escaped}%`;

    const searchName = (searchType & 1) !== 0;
    const searchBody = (searchType & 2) !== 0;
    const searchId = (searchType & 4) !== 0;
    const searchTitle = (searchType & 8) !== 0;

    const threadConditions: string[] = [];
    const responseConditions: string[] = [];
    const threadSqlParams: (string | number)[] = [searchPattern];
    const responseSqlParams: (string | number)[] = [searchPattern];

    if (searchTitle) threadConditions.push("t.title ILIKE $1");
    if (searchBody) responseConditions.push("r.response_content ILIKE $1");
    if (searchName) {
      responseConditions.push("r.author_name ILIKE $1");
      threadConditions.push("EXISTS (SELECT 1 FROM responses r2 WHERE r2.thread_id = t.id AND r2.author_name ILIKE $1)");
    }
    if (searchId) responseConditions.push("r.hash_id ILIKE $1");

    const threadWhere = threadConditions.length > 0 ? threadConditions.join(" OR ") : "1=0";
    const responseWhere = responseConditions.length > 0 ? responseConditions.join(" OR ") : "1=0";

    const threadBoardParts = boardId ? [`t.board_id = $${threadSqlParams.length + 1}::uuid`] : [];
    const responseBoardParts = boardId ? [`r.board_id = $${responseSqlParams.length + 1}::uuid`] : [];
    if (boardId) {
      threadSqlParams.push(boardId);
      responseSqlParams.push(boardId);
    }

    const threadDateParts: string[] = [];
    const responseDateParts: string[] = [];
    if (dateFrom) {
      threadSqlParams.push(dateFrom);
      responseSqlParams.push(dateFrom);
      threadDateParts.push(`t.posted_at >= $${threadSqlParams.length}`);
      responseDateParts.push(`r.posted_at >= $${responseSqlParams.length}`);
    }
    if (dateTo) {
      threadSqlParams.push(dateTo);
      responseSqlParams.push(dateTo);
      threadDateParts.push(`t.posted_at <= $${threadSqlParams.length}`);
      responseDateParts.push(`r.posted_at <= $${responseSqlParams.length}`);
    }

    const threadBoardClause = threadBoardParts.length > 0 ? ` AND ${threadBoardParts.join(" AND ")}` : "";
    const responseBoardClause = responseBoardParts.length > 0 ? ` AND ${responseBoardParts.join(" AND ")}` : "";
    const threadDateClause = threadDateParts.length > 0 ? ` AND ${threadDateParts.join(" AND ")}` : "";
    const responseDateClause = responseDateParts.length > 0 ? ` AND ${responseDateParts.join(" AND ")}` : "";

    const threadResults = await sql.unsafe(`
      SELECT
        'thread' as type,
        t.id as thread_id,
        t.title as thread_title,
        NULL::integer as response_number,
        NULL::text as author_name,
        t.title as content,
        t.posted_at,
        NULL::text as hash_id
      FROM threads t
      WHERE (${threadWhere})${threadDateClause}${threadBoardClause}
      ORDER BY t.posted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, threadSqlParams);

    const responseResults = await sql.unsafe(`
      SELECT
        'response' as type,
        r.thread_id,
        t.title as thread_title,
        r.response_number,
        r.author_name,
        r.response_content as content,
        r.posted_at,
        r.hash_id
      FROM responses r
      JOIN threads t ON r.thread_id = t.id
      WHERE (${responseWhere})${responseDateClause}${responseBoardClause}
      ORDER BY r.posted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, responseSqlParams);

    const threadCountResult = await sql.unsafe(`
      SELECT COUNT(*) as count FROM threads t WHERE (${threadWhere})${threadDateClause}${threadBoardClause}
    `, threadSqlParams);

    const responseCountResult = await sql.unsafe(`
      SELECT COUNT(*) as count FROM responses r
      JOIN threads t ON r.thread_id = t.id
      WHERE (${responseWhere})${responseDateClause}${responseBoardClause}
    `, responseSqlParams);

    const total = Number(threadCountResult[0]?.count || 0) + Number(responseCountResult[0]?.count || 0);

    const allResults = [...(threadResults || []), ...(responseResults || [])];

    logger.info({
      operation: "searchRepository",
      resultCount: allResults.length,
      total,
      message: "Search completed",
    });

    return ok({
      items: allResults.map((r) => ({
        type: r.type as "thread" | "response",
        threadId: String(r.thread_id),
        threadTitle: String(r.thread_title),
        responseNumber: r.response_number ?? undefined,
        authorName: r.author_name ?? undefined,
        content: String(r.content),
        postedAt: new Date(r.posted_at as string),
        hashId: r.hash_id ?? undefined,
      })),
      total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "searchRepository",
      error,
      message: `Search error: ${message}`,
    });
    return err(new DatabaseError(`検索中にエラーが発生しました: ${message}`, error));
  }
};
