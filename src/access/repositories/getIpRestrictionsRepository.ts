import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type IpRestriction = {
  id: string;
  ipOrCidr: string;
  restrictionType: "deny" | "allow";
  note: string;
  createdAt: Date;
};

export const getIpRestrictionsRepository = async (
  { sql, logger }: VakContext,
  restrictionType?: "deny" | "allow"
): Promise<Result<IpRestriction[], DatabaseError>> => {
  logger.debug({
    operation: "getIpRestrictions",
    restrictionType,
    message: "Fetching IP restrictions",
  });

  try {
    const rows = restrictionType
      ? await sql`
        SELECT id, ip_or_cidr, restriction_type, note, created_at FROM ip_restrictions
        WHERE restriction_type = ${restrictionType}
        ORDER BY created_at DESC
      `
      : await sql`
        SELECT id, ip_or_cidr, restriction_type, note, created_at FROM ip_restrictions
        ORDER BY created_at DESC
      `;

    if (!rows) {
      logger.error({
        operation: "getIpRestrictions",
        message: "Failed to retrieve IP restrictions, no result from database",
      });
      return err(new DatabaseError("IP制限の取得に失敗しました"));
    }

    const restrictions: IpRestriction[] = [];
    for (const r of rows) {
      restrictions.push({
        id: String(r.id),
        ipOrCidr: String(r.ip_or_cidr),
        restrictionType: String(r.restriction_type) as "deny" | "allow",
        note: String(r.note || ""),
        createdAt: new Date(r.created_at),
      });
    }

    logger.info({
      operation: "getIpRestrictions",
      count: restrictions.length,
      message: "IP restrictions retrieved successfully",
    });

    return ok(restrictions);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getIpRestrictions",
      error,
      message: msg,
    });
    return err(new DatabaseError(`IP制限の取得に失敗: ${msg}`, error));
  }
};
