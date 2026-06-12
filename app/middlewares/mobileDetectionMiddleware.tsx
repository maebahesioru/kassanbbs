import { createMiddleware } from "hono/factory";

import { detectClientType } from "../../src/detection/services/mobileDetectionService";

import type { ClientInfo } from "../../src/detection/services/mobileDetectionService";

export const mobileDetectionMiddleware = () => {
  return createMiddleware(async (c, next) => {
    const ua = c.req.header("User-Agent") || "";
    const clientInfo = detectClientType(ua);
    c.set("clientInfo", clientInfo);
    await next();
  });
};
