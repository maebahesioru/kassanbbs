export type ReadUserEntry = {
  readonly _type: "ReadUserEntry";
  readonly id: string;
  readonly ipOrCidr: string;
  readonly restrictionType: "deny" | "allow";
  readonly note: string;
  readonly createdAt: Date;
  readonly hostPattern: string;
  readonly uaPattern: string;
  readonly sessionId: string;
  readonly expiresAt: Date | null;
  readonly denyMethod: "host" | "disable" | "tate";
  readonly ipRangeEnd: string;
  readonly ipVersion: number;
};

export const createReadUserEntry = (row: {
  id: string;
  ip_or_cidr: string;
  restriction_type: string;
  note: string;
  created_at: Date;
  host_pattern: string | null;
  ua_pattern: string | null;
  session_id: string | null;
  expires_at: Date | null;
  deny_method: string | null;
  ip_range_end: string | null;
  ip_version: number | null;
}): ReadUserEntry => ({
  _type: "ReadUserEntry",
  id: row.id,
  ipOrCidr: row.ip_or_cidr,
  restrictionType: row.restriction_type as "deny" | "allow",
  note: row.note ?? "",
  createdAt: row.created_at,
  hostPattern: row.host_pattern ?? "",
  uaPattern: row.ua_pattern ?? "",
  sessionId: row.session_id ?? "",
  expiresAt: row.expires_at,
  denyMethod: (row.deny_method as "host" | "disable" | "tate") ?? "host",
  ipRangeEnd: row.ip_range_end ?? "",
  ipVersion: row.ip_version ?? 4,
});
