import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { WriteThreadId } from "../domain/write/WriteThreadId";
import type { ThreadAttr } from "../domain/read/ReadThreadAttr";
import type { Result } from "neverthrow";

export const updateThreadAttrsRepository = async (
  { sql, logger }: VakContext,
  { threadId, attrs }: { threadId: WriteThreadId; attrs: ThreadAttr }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "updateThreadAttrs",
    threadId: threadId.val,
    message: "Updating thread attributes",
  });

  try {
    const result = await sql<{ id: string }[]>`
        UPDATE
            threads
        SET
            attrs = ${JSON.stringify(attrs)}::jsonb
        WHERE
            id = ${threadId.val}::uuid RETURNING id
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateThreadAttrs",
        threadId: threadId.val,
        message: "Failed to update thread attrs, invalid database response",
      });
      return err(new DatabaseError("スレッド属性の更新に失敗しました"));
    }

    logger.info({
      operation: "updateThreadAttrs",
      threadId: threadId.val,
      message: "Thread attributes updated successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateThreadAttrs",
      threadId: threadId.val,
      error,
      message: `Database error while updating thread attrs: ${message}`,
    });
    return err(
      new DatabaseError(`属性更新処理中にエラーが発生しました: ${message}`, error)
    );
  }
};
