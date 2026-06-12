import { ipMatchesCidr } from "../../access/services/ipMatcherService";

import type { ReadUserEntry } from "../domain/read/ReadUserEntry";

export type AccessCheckParams = {
  ip: string;
  hostname: string;
  userAgent: string;
  sessionId: string;
};

export type AccessCheckResult = {
  allowed: boolean;
  method: "host" | "disable" | "tate";
  reason?: string;
};

export const ipToInt = (ip: string): number => {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return -1;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

export const ipInRange = (ip: string, rangeStart: string, rangeEnd: string): boolean => {
  const ipNum = ipToInt(ip);
  const startNum = ipToInt(rangeStart);
  const endNum = ipToInt(rangeEnd);
  if (ipNum === -1 || startNum === -1 || endNum === -1) return false;
  return ipNum >= startNum && ipNum <= endNum;
};

export const isIpv6 = (ip: string): boolean => ip.includes(":");

export const checkUserAccess = (
  entries: ReadUserEntry[],
  params: AccessCheckParams
): AccessCheckResult => {
  const denyEntries = entries.filter(e => e.restrictionType === "deny");
  const allowEntries = entries.filter(e => e.restrictionType === "allow");

  for (const entry of denyEntries) {
    if (entry.expiresAt && new Date() > entry.expiresAt) continue;

    const isV6 = isIpv6(params.ip);
    if (entry.ipVersion === 4 && isV6) continue;
    if (entry.ipVersion === 6 && !isV6) continue;

    let matched = false;

    if (entry.ipOrCidr) {
      if (entry.ipRangeEnd) {
        if (ipInRange(params.ip, entry.ipOrCidr, entry.ipRangeEnd)) {
          matched = true;
        }
      } else if (ipMatchesCidr(params.ip, entry.ipOrCidr)) {
        matched = true;
      }
    }

    if (!matched && entry.hostPattern) {
      try {
        if (new RegExp(entry.hostPattern, "i").test(params.hostname)) {
          matched = true;
        }
      } catch { /* invalid regex, skip */ }
    }

    if (!matched && entry.uaPattern) {
      try {
        if (new RegExp(entry.uaPattern, "i").test(params.userAgent)) {
          matched = true;
        }
      } catch { /* invalid regex, skip */ }
    }

    if (!matched && entry.sessionId) {
      if (params.sessionId === entry.sessionId) {
        matched = true;
      }
    }

    if (matched) {
      return { allowed: false, method: entry.denyMethod, reason: `アクセスが制限されています: ${entry.note || entry.ipOrCidr}` };
    }
  }

  for (const entry of allowEntries) {
    const isV6 = isIpv6(params.ip);
    if (entry.ipVersion === 4 && isV6) continue;
    if (entry.ipVersion === 6 && !isV6) continue;

    if (entry.ipOrCidr) {
      if (entry.ipRangeEnd) {
        if (ipInRange(params.ip, entry.ipOrCidr, entry.ipRangeEnd)) {
          return { allowed: true, method: "host" };
        }
      } else if (ipMatchesCidr(params.ip, entry.ipOrCidr)) {
        return { allowed: true, method: "host" };
      }
    }

    if (entry.hostPattern) {
      try {
        if (new RegExp(entry.hostPattern, "i").test(params.hostname)) {
          return { allowed: true, method: "host" };
        }
      } catch { /* skip */ }
    }

    if (entry.uaPattern) {
      try {
        if (new RegExp(entry.uaPattern, "i").test(params.userAgent)) {
          return { allowed: true, method: "host" };
        }
      } catch { /* skip */ }
    }

    if (entry.sessionId && params.sessionId === entry.sessionId) {
      return { allowed: true, method: "host" };
    }
  }

  return { allowed: true, method: "host" };
};
