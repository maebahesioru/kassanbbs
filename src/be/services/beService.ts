import { err, ok } from "neverthrow";

import { ErrorCodes } from "../../error/completeErrorCodes";

import type { Result } from "neverthrow";

export type BeProfile = {
  beId: string;
  username: string;
  tripcode: string;
  profileUrl: string;
};

export const fetchBeProfile = async (
  beId: string
): Promise<Result<BeProfile | null, Error>> => {
  try {
    const response = await fetch(
      `https://be.2ch.net/test/profile.php?uid=${encodeURIComponent(beId)}`,
      {
        headers: { "User-Agent": "KassanBBS/1.0" },
      }
    );
    if (!response.ok) return ok(null);

    const text = await response.text();
    const profile: Record<string, string> = {};
    text.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key) profile[key.trim()] = valueParts.join("=").trim();
    });

    if (!profile.uid) return ok(null);

    return ok({
      beId: profile.uid,
      username: profile.name || profile.uid,
      tripcode: profile.trip || "",
      profileUrl: `https://be.2ch.net/user/${profile.uid}`,
    });
  } catch {
    return err(new Error(`[${ErrorCodes.BE_GET_FAILED.code}] ${ErrorCodes.BE_GET_FAILED.msg}`));
  }
};

export const verifyBeLogin = async (
  beId: string,
  password: string
): Promise<Result<boolean, Error>> => {
  try {
    const formData = new URLSearchParams();
    formData.append("u", beId);
    formData.append("p", password);
    formData.append("submit", "\u30ED\u30B0\u30A4\u30F3");

    const response = await fetch("https://be.2ch.net/test/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "KassanBBS/1.0",
      },
      body: formData.toString(),
      redirect: "manual",
    });

    return ok(response.status === 302);
  } catch {
    return err(new Error(`[${ErrorCodes.BE_CONNECT_FAILED.code}] ${ErrorCodes.BE_CONNECT_FAILED.msg}`));
  }
};
