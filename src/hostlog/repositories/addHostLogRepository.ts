import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const addHostLogRepository = async (
  { sql, logger }: VakContext,
  params: { host: string; ipAddress: string; hashId: string; userAgent: string }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({
    operation: "addHostLog",
    ipAddress: params.ipAddress,
    host: params.host,
    message: "Adding host log entry to database",
  });

  const id = uuidv7();

  try {
    const result = await sql`
      INSERT INTO host_logs(id, host, ip_address, hash_id, user_agent)
      VALUES(${id}::uuid, ${params.host}, ${params.ipAddress}, ${params.hashId}, ${params.userAgent})
      RETURNING id
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addHostLog",
        params,
        message: "Failed to add host log, invalid database response",
      });
      return err(new DatabaseError("ホストログの追加に失敗しました"));
    }

    logger.info({
      operation: "addHostLog",
      id,
      ipAddress: params.ipAddress,
      message: "Host log entry added successfully",
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addHostLog",
      error,
      params,
      message: `Database error while adding host log: ${message}`,
    });
    return err(
      new DatabaseError(
        `ホストログの追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
