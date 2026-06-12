import { err, ok } from "neverthrow";

import type { Result } from "neverthrow";

export interface ImgurTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  account_username: string;
}

export interface ImgurImageData {
  id: string;
  deletehash: string;
  link: string;
  title: string | null;
  description: string | null;
  datetime: number;
  type: string;
  animated: boolean;
  width: number;
  height: number;
  size: number;
  views: number;
  bandwidth: number;
}

export const getAuthorizationUrl = (
  clientId: string,
  redirectUri: string,
  state?: string
): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
  });
  if (state) params.set("state", state);
  return `https://api.imgur.com/oauth2/authorize?${params.toString()}`;
};

export const obtainAccessToken = async (
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<Result<ImgurTokenResponse, Error>> => {
  try {
    const response = await fetch("https://api.imgur.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await response.json() as ImgurTokenResponse & { error?: string };

    if (data.error) {
      return err(new Error(`Imgur OAuthエラー: ${data.error}`));
    }

    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return err(new Error(`Imgur OAuthトークン取得に失敗しました: ${message}`));
  }
};

export const refreshAccessToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<Result<ImgurTokenResponse, Error>> => {
  try {
    const response = await fetch("https://api.imgur.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    const data = await response.json() as ImgurTokenResponse & { error?: string };

    if (data.error) {
      return err(new Error(`Imgurトークンリフレッシュエラー: ${data.error}`));
    }

    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return err(new Error(`Imgurトークンリフレッシュに失敗しました: ${message}`));
  }
};

export const uploadToImgur = async (
  imageBase64: string,
  clientId: string,
  accessToken?: string
): Promise<Result<string, Error>> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      headers["Authorization"] = `Client-ID ${clientId}`;
    }

    const response = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers,
      body: JSON.stringify({ image: imageBase64, type: "base64" }),
    });

    const data = await response.json() as {
      success: boolean;
      data: { link: string; id?: string; deletehash?: string };
    };

    if (data.success) {
      return ok(data.data.link);
    }

    return err(new Error("Imgur画像アップロードに失敗しました"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return err(new Error(`Imgurアップロードエラー: ${message}`));
  }
};

export const deleteImageByDeleteHash = async (
  deletehash: string,
  clientId: string
): Promise<Result<void, Error>> => {
  try {
    const response = await fetch(
      `https://api.imgur.com/3/image/${deletehash}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Client-ID ${clientId}`,
        },
      }
    );

    const data = await response.json() as { success: boolean; data?: boolean };

    if (data.success) {
      return ok(undefined);
    }

    return err(new Error("Imgur画像削除に失敗しました"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return err(new Error(`Imgur削除エラー: ${message}`));
  }
};
