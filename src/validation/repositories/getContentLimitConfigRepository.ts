import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { ContentLimitConfig } from "../services/contentLimitsService";
import type { Result } from "neverthrow";

const DEFAULT_MAX_LINES = 30;
const DEFAULT_MAX_LINE_WIDTH = 80;
const DEFAULT_MAX_ANCHORS = 10;

export const getContentLimitConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<ContentLimitConfig, DatabaseError>> => {
  logger.debug({
    operation: "getContentLimitConfig",
    message: "Fetching content limit configuration from database",
  });

  try {
    const result = await sql<
      {
        max_lines: number;
        max_line_width: number;
        max_anchors: number;
      }[]
    >`
      SELECT
        COALESCE(max_lines, ${DEFAULT_MAX_LINES}) as max_lines,
        COALESCE(max_line_width, ${DEFAULT_MAX_LINE_WIDTH}) as max_line_width,
        COALESCE(max_anchors, ${DEFAULT_MAX_ANCHORS}) as max_anchors
      FROM config
    `;

    if (!result || result.length !== 1) {
      logger.warn({
        operation: "getContentLimitConfig",
        message: "Config row not found, using defaults",
      });
      return ok({
        maxLines: DEFAULT_MAX_LINES,
        maxLineWidth: DEFAULT_MAX_LINE_WIDTH,
        maxAnchors: DEFAULT_MAX_ANCHORS,
      });
    }

    const config: ContentLimitConfig = {
      maxLines: Number(result[0].max_lines) || DEFAULT_MAX_LINES,
      maxLineWidth: Number(result[0].max_line_width) || DEFAULT_MAX_LINE_WIDTH,
      maxAnchors: Number(result[0].max_anchors) || DEFAULT_MAX_ANCHORS,
    };

    logger.info({
      operation: "getContentLimitConfig",
      maxLines: config.maxLines,
      maxLineWidth: config.maxLineWidth,
      maxAnchors: config.maxAnchors,
      message: "Content limit configuration retrieved successfully",
    });

    return ok(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getContentLimitConfig",
      error,
      message: `Database error while retrieving content limit config: ${message}`,
    });
    return err(
      new DatabaseError(
        `コンテンツ制限設定の取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
