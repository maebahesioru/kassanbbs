import { env } from "hono/adapter";
import { getCookie, setCookie } from "hono/cookie";
import { createHash } from "node:crypto";
import type { Context } from "hono";

export const USER_COOKIE_NAME = "vak_user";
export const AUTH_TOKEN_COOKIE_NAME = "vak_auth_token";
export const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const AUTH_TOKEN_COOKIE_MAX_AGE = 60 * 60;

export type UserCookieData = {
  name: string;
  mail: string;
};

const getCookieSecret = (c: Context): string => {
  const secret = env<{ COOKIE_SECRET: string }>(c).COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET not configured");
  return secret;
};

const signCookie = (data: string, secret: string): string => {
  const hash = createHash("sha256").update(data + secret).digest("hex").substring(0, 16);
  return `${data}.${hash}`;
};

const verifyCookie = (signed: string, secret: string): string | null => {
  const parts = signed.split(".");
  if (parts.length !== 2) return null;
  const data = parts[0];
  const hash = createHash("sha256").update(data + secret).digest("hex").substring(0, 16);
  if (hash !== parts[1]) return null;
  return data;
};

export const getUserCookieData = (c: Context): UserCookieData => {
  try {
    const cookie = getCookie(c, USER_COOKIE_NAME);
    if (cookie) {
      const secret = getCookieSecret(c);
      const verified = verifyCookie(cookie, secret);
      if (!verified) return { name: "", mail: "" };
      const decoded = Buffer.from(verified, "base64").toString("utf-8");
      return JSON.parse(decoded) as UserCookieData;
    }
  } catch {}
  return { name: "", mail: "" };
};

export const setUserCookieData = (c: Context, data: UserCookieData): void => {
  const secret = getCookieSecret(c);
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
  const signed = signCookie(encoded, secret);
  setCookie(c, USER_COOKIE_NAME, signed, {
    maxAge: USER_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  });
};

export const getAuthTokenCookieData = (c: Context): string | null => {
  try {
    const cookie = getCookie(c, AUTH_TOKEN_COOKIE_NAME);
    if (cookie) {
      const secret = getCookieSecret(c);
      const verified = verifyCookie(cookie, secret);
      if (!verified) return null;
      return Buffer.from(verified, "base64").toString("utf-8");
    }
  } catch {}
  return null;
};

export const setAuthTokenCookieData = (c: Context, token: string): void => {
  const secret = getCookieSecret(c);
  const encoded = Buffer.from(token).toString("base64");
  const signed = signCookie(encoded, secret);
  setCookie(c, AUTH_TOKEN_COOKIE_NAME, signed, {
    maxAge: AUTH_TOKEN_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  });
};
