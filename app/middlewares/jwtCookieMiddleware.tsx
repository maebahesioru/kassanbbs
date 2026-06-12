import { env } from "hono/adapter";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

import { ErrorMessage } from "../components/ErrorMessage";

export const jwtAuthMiddleware = () => {
  return createMiddleware(async (c, next) => {
    const secret =
      env<{ JWT_SECRET_KEY: string | undefined }>(c).JWT_SECRET_KEY ||
      import.meta.env.VITE_JWT_SECRET_KEY;

    if (!secret) {
      return c.render(
        <ErrorMessage
          error={new Error("JWT_SECRET_KEYが設定されていません。")}
        />
      );
    }

    if (secret === "secret" && import.meta.env.PROD) {
      console.warn("JWT_SECRET_KEY is set to the default value 'secret' in production - this is insecure!");
    }

    const token = getCookie(c, "jwt");

    if (!token) {
      return c.redirect("/login/admin", 302);
    }

    try {
      const payload = await verify(token, secret);
      c.set("jwtPayload", payload as { exp: number; username?: string; isSuperAdmin?: boolean });
      await next();
    } catch {
      return c.redirect("/login/admin", 302);
    }
  });
};
