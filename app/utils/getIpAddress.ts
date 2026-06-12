import { env } from "hono/adapter";

import { getConnInfowithRuntimeSwitch } from "./getConnInfoRuntimeSwitch";

import type { Context } from "hono";

const CLOUDFLARE_IPV4_RANGES = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
  "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
  "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
  "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];

const ipInCIDR = (ip: string, cidr: string): boolean => {
  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
  const rangeNum = range.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
};

const isCloudflareIp = (ip: string): boolean => {
  if (!ip.includes(".")) return false;
  return CLOUDFLARE_IPV4_RANGES.some((cidr) => ipInCIDR(ip, cidr));
};

export const getIpAddress = (c: Context): string => {
  const trustedProxyId = env<{ TRUSTED_PROXY_ID: string }>(c).TRUSTED_PROXY_ID;

  // 1. Check custom proxy header first
  const customProxyId = c.req.header("X-Custom-ProxyID");
  if (customProxyId && trustedProxyId && customProxyId === trustedProxyId) {
    const forwarded = c.req.header("X-Forwarded-For");
    if (forwarded) return forwarded.split(",")[0].trim();
  }

  // 2. Only trust CF-Connecting-IP from Cloudflare
  const cfConnectingIp = c.req.header("CF-Connecting-IP");
  const remoteAddr = c.env?.REMOTE_ADDR as string | undefined;
  if (cfConnectingIp && remoteAddr && isCloudflareIp(remoteAddr)) return cfConnectingIp;

  // 3. X-Forwarded-For with trusted proxy
  const xff = c.req.header("X-Forwarded-For");
  if (xff && trustedProxyId) {
    return xff.split(",")[0].trim();
  }

  // 4. Direct connection
  return remoteAddr || c.req.header("X-Real-IP") || "127.0.0.1";
};
