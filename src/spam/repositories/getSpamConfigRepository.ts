import { err, ok } from "neverthrow";

import { DatabaseError, DataNotFoundError } from "../../shared/types/Error";
import {
  createReadSpamConfig,
  type ReadSpamConfig,
} from "../domain/read/ReadSpamConfig";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const getSpamConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<
  Result<ReadSpamConfig, DatabaseError | DataNotFoundError>
> => {
  logger.debug({
    operation: "getSpamConfig",
    message: "Fetching spam detection configuration from database",
  });

  try {
    const result = await sql<
      { enable_spam_detection: boolean; spam_threshold: number }[]
    >`
        SELECT enable_spam_detection, spam_threshold FROM config LIMIT 1
      `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getSpamConfig",
        message:
          "Failed to retrieve spam detection configuration, invalid database response",
      });
      return err(new DataNotFoundError("設定の取得に失敗しました"));
    }

    logger.debug({
      operation: "getSpamConfig",
      enableSpamDetection: result[0].enable_spam_detection,
      spamThreshold: result[0].spam_threshold,
      message: "Spam detection configuration retrieved from database",
    });

    const spamConfigResult = createReadSpamConfig({
      enableSpamDetection: result[0].enable_spam_detection,
      spamThreshold: result[0].spam_threshold,
    });

    if (spamConfigResult.isErr()) {
      logger.error({
        operation: "getSpamConfig",
        error: spamConfigResult.error,
        message: "Invalid spam detection configuration format",
      });
      return err(spamConfigResult.error);
    }

    logger.info({
      operation: "getSpamConfig",
      enableSpamDetection: result[0].enable_spam_detection,
      spamThreshold: result[0].spam_threshold,
      message:
        "Spam detection configuration retrieved and validated successfully",
    });

    return ok(spamConfigResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getSpamConfig",
      error,
      message: `Database error while fetching spam detection configuration: ${message}`,
    });
    return err(
      new DatabaseError(`設定取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
