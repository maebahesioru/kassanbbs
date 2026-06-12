import crypto from "node:crypto";
import { ok, err } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

const generateToken = (): string => {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 12);
};

export const createAuthTokenRepository = async (
  { sql, logger }: VakContext,
  { ipAddress, sessionId }: { ipAddress: string; sessionId: string }
): Promise<Result<string, DatabaseError>> => {
  logger.debug({
    operation: "createAuthToken",
    sessionId,
    message: "Creating auth token",
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  try {
    await sql`
      INSERT INTO auth_tokens(id, token, ip_address, session_id, expires_at)
      VALUES(${uuidv7()}, ${token}, ${ipAddress}, ${sessionId}, ${expiresAt})
    `;

    logger.info({
      operation: "createAuthToken",
      sessionId,
      message: "Auth token created successfully",
    });

    return ok(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "createAuthToken",
      error,
      sessionId,
      message: `Database error while creating auth token: ${message}`,
    });
    return err(
      new DatabaseError(`認証トークン作成中にエラーが発生しました: ${message}`, error)
    );
  }
};
