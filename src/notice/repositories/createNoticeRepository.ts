import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadNotice,
  type ReadNotice,
} from "../domain/read/ReadNotice";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const createNoticeRepository = async (
  { sql, logger }: VakContext,
  params: {
    title: string;
    content: string;
    targetType: string;
    targetValue: string;
    expiresAt: Date | null;
  }
): Promise<Result<ReadNotice, DatabaseError>> => {
  logger.debug({
    operation: "createNotice",
    title: params.title,
    targetType: params.targetType,
    message: "Adding new notice to database",
  });

  const id = uuidv7();

  try {
    const result = await sql<{
      id: string; title: string; content: string;
      target_type: string; target_value: string;
      is_active: boolean; expires_at: Date | null; created_at: Date;
    }[]>`
      INSERT INTO notices(id, title, content, target_type, target_value, expires_at)
      VALUES(${id}::uuid, ${params.title}, ${params.content},
             ${params.targetType}, ${params.targetValue},
             ${params.expiresAt ? params.expiresAt.toISOString() : null}::timestamptz)
      RETURNING id, title, content, target_type, target_value, is_active, expires_at, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "createNotice",
        title: params.title,
        message: "Failed to add notice, invalid database response",
      });
      return err(new DatabaseError("お知らせの追加に失敗しました"));
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
        operation: "createNotice",
        error: noticeResult.error,
        message: "Failed to create ReadNotice from database result",
      });
      return err(noticeResult.error);
    }

    logger.info({
      operation: "createNotice",
      id: result[0].id,
      title: params.title,
      message: "Notice added successfully",
    });

    return ok(noticeResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "createNotice",
      error,
      title: params.title,
      message: `Database error while adding notice: ${message}`,
    });
    return err(
      new DatabaseError(
        `お知らせの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
