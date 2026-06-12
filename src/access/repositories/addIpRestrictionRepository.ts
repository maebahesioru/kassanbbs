import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";
import type { IpRestriction } from "./getIpRestrictionsRepository";

export const addIpRestrictionRepository = async (
  { sql, logger }: VakContext,
  params: { ipOrCidr: string; restrictionType: "deny" | "allow"; note: string }
): Promise<Result<IpRestriction, DatabaseError>> => {
  logger.debug({
    operation: "addIpRestriction",
    params,
    message: "Adding new IP restriction to database",
  });

  const id = uuidv7();

  try {
    const result = await sql`
      INSERT INTO ip_restrictions(id, ip_or_cidr, restriction_type, note)
      VALUES(${id}::uuid, ${params.ipOrCidr}, ${params.restrictionType}, ${params.note})
      RETURNING *
    `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "addIpRestriction",
        params,
        message: "Failed to add IP restriction, invalid database response",
      });
      return err(new DatabaseError("IP制限の追加に失敗しました"));
    }

    const r = result[0];

    logger.info({
      operation: "addIpRestriction",
      id,
      params,
      message: "IP restriction added successfully",
    });

    return ok({
      id: String(r.id),
      ipOrCidr: String(r.ip_or_cidr),
      restrictionType: String(r.restriction_type) as "deny" | "allow",
      note: String(r.note || ""),
      createdAt: new Date(r.created_at),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "addIpRestriction",
      error,
      params,
      message: `Database error while adding IP restriction: ${message}`,
    });
    return err(
      new DatabaseError(
        `IP制限の追加中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
