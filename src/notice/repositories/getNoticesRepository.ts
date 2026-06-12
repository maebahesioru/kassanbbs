import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNotice,
  type ReadNotice,
} from "../domain/read/ReadNotice";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getNoticesRepository = async (
  { sql, logger }: VakContext,
  includeInactive = false
): Promise<Result<ReadNotice[], DatabaseError>> => {
  logger.debug({
    operation: "getNotices",
    includeInactive,
    message: "Fetching notices from database",
  });

  try {
    const result = await sql<{
      id: string; title: string; content: string;
      target_type: string; target_value: string;
      is_active: boolean; expires_at: Date | null; created_at: Date;
    }[]>`
      SELECT id, title, content, target_type, target_value,
             is_active, expires_at, created_at
      FROM notices
      ${includeInactive ? sql`` : sql`WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`}
      ORDER BY created_at DESC
    `;

    if (!result) {
      logger.error({
        operation: "getNotices",
        message: "Failed to retrieve notices, no result from database",
      });
      return err(new DatabaseError("お知らせの取得に失敗しました"));
    }

    const notices: ReadNotice[] = [];
    for (const row of result) {
      const noticeResult = createReadNotice({
        id: row.id,
        title: row.title,
        content: row.content,
        targetType: row.target_type,
        targetValue: row.target_value,
        isActive: row.is_active,
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        createdAt: new Date(row.created_at),
      });
      if (noticeResult.isErr()) {
        logger.error({
          operation: "getNotices",
          error: noticeResult.error,
          message: "Failed to create ReadNotice from database row",
        });
        return err(noticeResult.error);
      }
      notices.push(noticeResult.value);
    }

    logger.info({
      operation: "getNotices",
      count: notices.length,
      message: "Notices retrieved successfully",
    });

    return ok(notices);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getNotices",
      error,
      message: `Database error while retrieving notices: ${message}`,
    });
    return err(
      new DatabaseError(
        `お知らせの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
