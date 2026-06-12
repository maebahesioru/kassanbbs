import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import {
  createReadBanner,
  type ReadBanner,
} from "../domain/read/ReadBanner";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const createBannerRepository = async (
  { sql, logger }: VakContext,
  params: {
    name: string;
    imageUrl: string;
    linkUrl: string;
    position: number;
  }
): Promise<Result<ReadBanner, DatabaseError>> => {
  logger.debug({
    operation: "createBanner",
    name: params.name,
    message: "Adding new banner to database",
  });

  const id = uuidv7();

  try {
    const result = await sql<{
      id: string; name: string; image_url: string; link_url: string;
      position: number; is_active: boolean; created_at: Date;
    }[]>`
      INSERT INTO banners(id, name, image_url, link_url, position)
      VALUES(${id}::uuid, ${params.name}, ${params.imageUrl}, ${params.linkUrl}, ${params.position})
      RETURNING id, name, image_url, link_url, position, is_active, created_at
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "createBanner",
        name: params.name,
        message: "Failed to add banner, invalid database response",
      });
      return err(new DatabaseError("バナーの追加に失敗しました"));
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
        operation: "createBanner",
        error: bannerResult.error,
        message: "Failed to create ReadBanner from database result",
      });
      return err(bannerResult.error);
    }

    logger.info({
      operation: "createBanner",
      id: result[0].id,
      name: params.name,
      message: "Banner added successfully",
    });

    return ok(bannerResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "createBanner",
      error,
      name: params.name,
      message: `Database error while adding banner: ${message}`,
    });
    return err(
      new DatabaseError(
        `バナーの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
