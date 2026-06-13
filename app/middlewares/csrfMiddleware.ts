import { HTTPException } from "hono/http-exception";

import type { MiddlewareHandler, Context } from "hono";

type IsAllowedOriginHandler = (origin: string, context: Context) => boolean;
interface CSRFOptions {
  origin?: string | string[] | IsAllowedOriginHandler;
}

const isSafeMethodRe = /^(GET|HEAD)$/;
const isRequestedByFormElementRe =
  /^\b(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i;

export const csrf = (options?: CSRFOptions): MiddlewareHandler => {
  const handler: IsAllowedOriginHandler = ((optsOrigin) => {
    if (!optsOrigin) {
      return (origin, c) => {
        const host = c.req.header("host");
        const proto = c.req.header("X-Forwarded-Proto") || new URL(c.req.url).protocol.slice(0, -1);
        if (host) {
          return origin === `${proto}://${host}`;
        }
        return origin === new URL(c.req.url).origin;
      };
    } else if (typeof optsOrigin === "string") {
      return (origin) => origin === optsOrigin;
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin);
    }
  })(options?.origin);

  const isAllowedOrigin = (origin: string | undefined, c: Context) => {
    if (origin === undefined) {
      return true;
    }
    return handler(origin, c);
  };

  return async function csrf(c, next) {
    if (
      !isSafeMethodRe.test(c.req.method) &&
      isRequestedByFormElementRe.test(
        c.req.header("content-type") || "text/plain"
      ) &&
      !isAllowedOrigin(c.req.header("origin"), c)
    ) {
      const res = new Response("Forbidden", {
        status: 403,
      });
      throw new HTTPException(403, { res });
    }

    await next();
  };
};
