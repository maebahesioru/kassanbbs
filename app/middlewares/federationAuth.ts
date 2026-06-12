import { env } from "hono/adapter";
import type { Context } from "hono";

export const checkFederationAuth = (c: Context): boolean => {
  const FEDERATION_SECRET = env<{ FEDERATION_SECRET: string }>(c).FEDERATION_SECRET || (import.meta as any).env?.VITE_FEDERATION_SECRET;
  if (!FEDERATION_SECRET) return false;
  const authHeader = c.req.header("Authorization");
  return authHeader === `Bearer ${FEDERATION_SECRET}`;
};
