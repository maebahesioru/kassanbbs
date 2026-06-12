import { ok } from "neverthrow";

import type { Result } from "neverthrow";

export type UpdateCheckResult = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseUrl: string;
};

export const checkForUpdates = async (): Promise<
  Result<UpdateCheckResult | null, Error>
> => {
  try {
    const response = await fetch(
      "https://api.github.com/repos/user/kassanbbs/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "KassanBBS",
        },
      }
    );
    if (!response.ok) return ok(null);

    const data = (await response.json()) as {
      tag_name: string;
      html_url: string;
    };
    const currentVersion = "1.0.0";

    return ok({
      hasUpdate: data.tag_name !== `v${currentVersion}`,
      latestVersion: data.tag_name,
      currentVersion,
      releaseUrl: data.html_url,
    });
  } catch {
    return ok(null);
  }
};
