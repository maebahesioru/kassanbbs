import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadBanner,
  type ReadBanner,
} from "../domain/read/ReadBanner";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getBannersRepository = async (
  { sql, logger }: VakContext,
  includeInactive = false
): Promise<Result<ReadBanner[], DatabaseError>> => {
  logger.debug({
    operation: "getBanners",
    includeInactive,
    message: "Fetching banners from database",
  });

  try {
    const result = await sql<{
      id: string; name: string; image_url: string; link_url: string;
      position: number; is_active: boolean; created_at: Date;
    }[]>`
      SELECT id, name, image_url, link_url, position, is_active, created_at
      FROM banners
      ${includeInactive ? sql`` : sql`WHERE is_active = TRUE`}
      ORDER BY position ASC
    `;

    if (!result) {
      logger.error({
        operation: "getBanners",
        message: "Failed to retrieve banners, no result from database",
      });
      return err(new DatabaseError("バナーの取得に失敗しました"));
    }

    const banners: ReadBanner[] = [];
    for (const row of result) {
      const bannerResult = createReadBanner({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        linkUrl: row.link_url,
        position: row.position,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
      });
      if (bannerResult.isErr()) {
        logger.error({
          operation: "getBanners",
          error: bannerResult.error,
          message: "Failed to create ReadBanner from database row",
        });
        return err(bannerResult.error);
      }
      banners.push(bannerResult.value);
    }

    logger.info({
      operation: "getBanners",
      count: banners.length,
      message: "Banners retrieved successfully",
    });

    return ok(banners);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getBanners",
      error,
      message: `Database error while retrieving banners: ${message}`,
    });
    return err(
      new DatabaseError(
        `バナーの取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
