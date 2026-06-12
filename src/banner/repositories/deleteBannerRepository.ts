import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const deleteBannerRepository = async (
  { sql, logger }: VakContext,
  id: string
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "deleteBanner",
    id,
    message: "Deleting banner from database",
  });

  try {
    const result = await sql`
      DELETE FROM banners WHERE id = ${id}::uuid
    `;

    if (!result || result.length === 0) {
      logger.error({
        operation: "deleteBanner",
        id,
        message: "Failed to delete banner, no rows affected",
      });
      return err(new DatabaseError("バナーの削除に失敗しました"));
    }

    logger.info({
      operation: "deleteBanner",
      id,
      message: "Banner deleted successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "deleteBanner",
      error,
      id,
      message: `Database error while deleting banner: ${message}`,
    });
    return err(
      new DatabaseError(
        `バナーの削除中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
