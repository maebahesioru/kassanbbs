export const checkProxyApi = async (ip: string, apiKey: string): Promise<{ isProxy: boolean; provider: string; risk: number }> => {
  try {
    const response = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1&risk=1`);
    const data = await response.json() as Record<string, unknown>;
    if (data.status === "ok") {
      const ipData = data[ip] as Record<string, unknown> | undefined;
      return {
        isProxy: ipData?.proxy === "yes" || ipData?.vpn === "yes",
        provider: (ipData?.provider as string) || "unknown",
        risk: parseInt((ipData?.risk as string) || "0", 10),
      };
    }
  } catch {
    // Silently fail, treat as non-proxy
  }
  return { isProxy: false, provider: "", risk: 0 };
};
