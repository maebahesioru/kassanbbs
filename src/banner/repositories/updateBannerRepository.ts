import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadBanner,
  type ReadBanner,
} from "../domain/read/ReadBanner";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updateBannerRepository = async (
  { sql, logger }: VakContext,
  params: {
    id: string;
    name: string;
    imageUrl: string;
    linkUrl: string;
    position: number;
    isActive: boolean;
  }
): Promise<Result<ReadBanner, DatabaseError>> => {
  logger.debug({
    operation: "updateBanner",
    id: params.id,
    message: "Updating banner in database",
  });

  try {
    const result = await sql<{
      id: string; name: string; image_url: string; link_url: string;
      position: number; is_active: boolean; created_at: Date;
    }[]>`
      UPDATE banners
      SET name = ${params.name},
          image_url = ${params.imageUrl},
          link_url = ${params.linkUrl},
          position = ${params.position},
          is_active = ${params.isActive}
      WHERE id = ${params.id}::uuid
      RETURNING id, name, image_url, link_url, position, is_active, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "updateBanner",
        id: params.id,
        message: "Failed to update banner, no rows affected",
      });
      return err(new DatabaseError("バナーの更新に失敗しました"));
    }

    const bannerResult = createReadBanner({
      id: result[0].id,
      name: result[0].name,
      imageUrl: result[0].image_url,
      linkUrl: result[0].link_url,
      position: result[0].position,
      isActive: result[0].is_active,
      createdAt: new Date(result[0].created_at),
    });
    if (bannerResult.isErr()) {
      logger.error({
        operation: "updateBanner",
        error: bannerResult.error,
        message: "Failed to create ReadBanner from database result",
      });
      return err(bannerResult.error);
    }

    logger.info({
      operation: "updateBanner",
      id: params.id,
      message: "Banner updated successfully",
    });

    return ok(bannerResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateBanner",
      error,
      id: params.id,
      message: `Database error while updating banner: ${message}`,
    });
    return err(
      new DatabaseError(
        `バナーの更新中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
