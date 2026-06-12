import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNotice,
  type ReadNotice,
} from "../domain/read/ReadNotice";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateNoticeRepository = async (
  { sql, logger }: VakContext,
  params: {
    id: string;
    title: string;
    content: string;
    targetType: string;
    targetValue: string;
    isActive: boolean;
    expiresAt: Date | null;
  }
): Promise<Result<ReadNotice, DatabaseError>> => {
  logger.debug({
    operation: "updateNotice",
    id: params.id,
    title: params.title,
    message: "Updating notice in database",
  });

  try {
    const result = await sql<{
      id: string; title: string; content: string;
      target_type: string; target_value: string;
      is_active: boolean; expires_at: Date | null; created_at: Date;
    }[]>`
      UPDATE notices
      SET title = ${params.title},
          content = ${params.content},
          target_type = ${params.targetType},
          target_value = ${params.targetValue},
          is_active = ${params.isActive},
          expires_at = ${params.expiresAt ? params.expiresAt.toISOString() : null}::timestamptz
      WHERE id = ${params.id}::uuid
      RETURNING id, title, content, target_type, target_value, is_active, expires_at, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateNotice",
        id: params.id,
        message: "Failed to update notice, invalid database response",
      });
      return err(new DatabaseError("お知らせの更新に失敗しました"));
    }

    const noticeResult = createReadNotice({
      id: result[0].id,
      title: result[0].title,
      content: result[0].content,
      targetType: result[0].target_type,
      targetValue: result[0].target_value,
      isActive: result[0].is_active,
      expiresAt: result[0].expires_at ? new Date(result[0].expires_at) : null,
      createdAt: new Date(result[0].created_at),
    });
    if (noticeResult.isErr()) {
      logger.error({
        operation: "updateNotice",
        error: noticeResult.error,
        message: "Failed to create ReadNotice from database result",
      });
      return err(noticeResult.error);
    }

    logger.info({
      operation: "updateNotice",
      id: params.id,
      title: params.title,
      message: "Notice updated successfully",
    });

    return ok(noticeResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateNotice",
      error,
      id: params.id,
      message: `Database error while updating notice: ${message}`,
    });
    return err(
      new DatabaseError(
        `お知らせの更新中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
