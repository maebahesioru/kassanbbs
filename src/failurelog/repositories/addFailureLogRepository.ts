import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import { VAK_VERSION } from "../../shared/version";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addFailureLogRepository = async (
  { sql, logger }: VakContext,
  params: {
    errorCode: number;
    errorMessage: string;
    name: string;
    mail: string;
    content: string;
    ipAddress: string;
    host: string;
    threadKey: string;
    userAgent: string;
  }
): Promise<Result<void, DatabaseError>> => {
  const sanitizedName = params.name.replace(/#.*$/, "").substring(0, 100);
  const sanitizedMail = params.mail.replace(/#.*$/, "").substring(0, 100);
  const sanitizedContent = params.content.substring(0, 500);

  const detail = JSON.stringify({
    errorCode: params.errorCode,
    name: sanitizedName,
    mail: sanitizedMail,
    content: sanitizedContent,
    threadKey: params.threadKey,
    userAgent: params.userAgent,
  });

  logger.debug({
    operation: "addFailureLog",
    errorCode: params.errorCode,
    ipAddress: params.ipAddress,
    message: "Adding failure log entry to database",
  });

  const id = uuidv7();

  try {
    const result = await sql`
      INSERT INTO admin_logs(id, action, detail, ip_address, log_type, version)
      VALUES(${id}::uuid, ${`FLR:${params.errorCode}`}, ${detail}, ${params.ipAddress}, 'FLR', ${VAK_VERSION})
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addFailureLog",
        params: { errorCode: params.errorCode, ipAddress: params.ipAddress },
        message: "Failed to add failure log, invalid database response",
      });
      return err(new DatabaseError("障害ログの追加に失敗しました"));
    }

    logger.info({
      operation: "addFailureLog",
      id,
      errorCode: params.errorCode,
      message: "Failure log entry added successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addFailureLog",
      error,
      params: { errorCode: params.errorCode, ipAddress: params.ipAddress },
      message: `Database error while adding failure log: ${message}`,
    });
    return err(
      new DatabaseError(
        `障害ログの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
