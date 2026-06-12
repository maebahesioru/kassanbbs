import crypto from "crypto";

import { err, ok } from "neverthrow";

import { getNinpochoRecordRepository } from "../repositories/getNinpochoRecordRepository";
import { upsertNinpochoRecordRepository } from "../repositories/upsertNinpochoRecordRepository";
import { DatabaseError, DataNotFoundError, PasswordDoesNotMatchError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type NinpochoProfile = {
  hashId: string;
  level: number;
  totalPosts: number;
  errorCount: number;
  savedAt: Date;
};

const SERVER_SECRET = "kassanbbs-ninpocho-profile-secret";

const hashPassword = (password: string): string => {
  return crypto
    .createHash("sha256")
    .update(`${SERVER_SECRET}:${password}`)
    .digest("hex");
};

export const saveNinpochoProfileUsecase = async (
  vakContext: VakContext,
  params: { hashId: string; password: string }
): Promise<Result<void, DatabaseError>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "saveNinpochoProfile",
    hashId: params.hashId,
    message: "Saving ninpocho profile",
  });

  const recordResult = await getNinpochoRecordRepository(vakContext, {
    hashId: params.hashId,
  });

  if (recordResult.isErr()) {
    logger.error({
      operation: "saveNinpochoProfile",
      error: recordResult.error,
      hashId: params.hashId,
      message: "Failed to fetch ninpocho record",
    });
    return err(recordResult.error);
  }

  const existingRecord = recordResult.value;

  if (!existingRecord) {
    logger.warn({
      operation: "saveNinpochoProfile",
      hashId: params.hashId,
      message: "No ninpocho record found for profile save",
    });
    return err(new DataNotFoundError("\u5FCD\u6CD5\u5E16\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"));
  }

  const passwordHash = hashPassword(params.password);
  const profileData: NinpochoProfile = {
    hashId: params.hashId,
    level: existingRecord.val.banLevel,
    totalPosts: 0,
    errorCount: existingRecord.val.errorCount,
    savedAt: new Date(),
  };

  const profileJson = JSON.stringify(profileData);

  const upsertResult = await upsertNinpochoRecordRepository(vakContext, {
    id: existingRecord.val.id,
    hashId: existingRecord.val.hashId,
    ipAddress: existingRecord.val.ipAddress,
    errorCount: existingRecord.val.errorCount,
    banLevel: existingRecord.val.banLevel,
    banUntil: existingRecord.val.banUntil,
  });

  if (upsertResult.isErr()) {
    logger.error({
      operation: "saveNinpochoProfile",
      error: upsertResult.error,
      hashId: params.hashId,
      message: "Failed to save profile data",
    });
    return err(upsertResult.error);
  }

  try {
    const { sql } = vakContext;
    await sql`
      UPDATE ninpocho_records
      SET
        profile_password_hash = ${passwordHash},
        saved_profile_data = ${profileJson}
      WHERE hash_id = ${params.hashId}
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "saveNinpochoProfile",
      error,
      hashId: params.hashId,
      message: `Database error while saving profile: ${message}`,
    });
    return err(new DatabaseError(`\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u4FDD\u5B58\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${message}`, error));
  }

  logger.info({
    operation: "saveNinpochoProfile",
    hashId: params.hashId,
    message: "Ninpocho profile saved successfully",
  });

  return ok(undefined);
};

export const loadNinpochoProfileUsecase = async (
  vakContext: VakContext,
  params: { hashId: string; password: string }
): Promise<Result<NinpochoProfile | null, DatabaseError | PasswordDoesNotMatchError>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "loadNinpochoProfile",
    hashId: params.hashId,
    message: "Loading ninpocho profile",
  });

  try {
    const { sql } = vakContext;
    const rows = await sql<
      {
        profile_password_hash: string | null;
        saved_profile_data: string | null;
      }[]
    >`
      SELECT profile_password_hash, saved_profile_data
      FROM ninpocho_records
      WHERE hash_id = ${params.hashId}
      LIMIT 1
    `;

    if (!rows || rows.length === 0 || !rows[0].saved_profile_data) {
      logger.debug({
        operation: "loadNinpochoProfile",
        hashId: params.hashId,
        message: "No saved profile found",
      });
      return ok(null);
    }

    const storedHash = rows[0].profile_password_hash;
    if (!storedHash) {
      logger.warn({
        operation: "loadNinpochoProfile",
        hashId: params.hashId,
        message: "No password hash stored",
      });
      return ok(null);
    }

    const providedHash = hashPassword(params.password);
    if (storedHash !== providedHash) {
      logger.warn({
        operation: "loadNinpochoProfile",
        hashId: params.hashId,
        message: "Password mismatch",
      });
      return err(new PasswordDoesNotMatchError("\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"));
    }

    const profile: NinpochoProfile = JSON.parse(rows[0].saved_profile_data);

    logger.info({
      operation: "loadNinpochoProfile",
      hashId: params.hashId,
      message: "Ninpocho profile loaded successfully",
    });

    return ok(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "loadNinpochoProfile",
      error,
      hashId: params.hashId,
      message: `Database error while loading profile: ${message}`,
    });
    return err(new DatabaseError(`\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${message}`, error));
  }
};
