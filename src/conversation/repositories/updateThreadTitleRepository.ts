import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateThreadTitleRepository = async (
  { sql, logger }: VakContext,
  params: {
    threadId: string;
    title: string;
  }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateThreadTitle",
    threadId: params.threadId,
    title: params.title,
    message: "Updating thread title",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE threads
        SET
          title = ${params.title}
        WHERE
          id = ${params.threadId}::uuid
        RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateThreadTitle",
        threadId: params.threadId,
        message: "Failed to update thread title, thread not found",
      });
      return err(new DatabaseError("スレッドタイトルの更新に失敗しました"));
    }

    logger.info({
      operation: "updateThreadTitle",
      threadId: params.threadId,
      title: params.title,
      message: "Thread title updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateThreadTitle",
      error,
      threadId: params.threadId,
      message: `Database error while updating thread title: ${message}`,
    });
    return err(
      new DatabaseError(`タイトル更新中にエラーが発生しました: ${message}`, error)
    );
  }
};
