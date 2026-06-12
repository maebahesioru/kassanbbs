import type { FederationConfig } from "../repositories/getFederationConfigRepository";

export const shareThread = async (
  config: FederationConfig,
  threadData: {
    title: string;
    epochId: number;
    authorName: string;
    content: string;
  }
): Promise<void> => {
  if (!config.enabled) return;

  for (const server of config.remoteServers) {
    try {
      await fetch(`${server}/api/federation/thread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.FEDERATION_SECRET || ""}`,
        },
        body: JSON.stringify(threadData),
      });
    } catch {
      // Federation is best-effort
    }
  }
};

export const fetchFederatedThreads = async (
  config: FederationConfig
): Promise<any[]> => {
  if (!config.enabled) return [];

  const threads: any[] = [];
  for (const server of config.remoteServers) {
    try {
      const response = await fetch(`${server}/api/federation/threads`, {
        headers: {
          "Authorization": `Bearer ${process.env.FEDERATION_SECRET || ""}`,
        },
      });
      if (response.ok) {
        const data = (await response.json()) as any[];
        threads.push(...data);
      }
    } catch {
      // Skip failed servers
    }
  }
  return threads;
};
