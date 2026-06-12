export const checkDnsbl = async (ip: string, dnsblHostnames: string[]): Promise<{ listed: boolean; services: string[] }> => {
  const reversedIp = ip.split(".").reverse().join(".");
  const listed: string[] = [];

  for (const hostname of dnsblHostnames) {
    if (!hostname.trim()) continue;
    try {
      const lookupHost = `${reversedIp}.${hostname.trim()}`;
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${lookupHost}&type=A`, {
        headers: { "Accept": "application/dns-json" }
      });
      const data = await response.json() as { Answer?: unknown[] };
      if (data.Answer && data.Answer.length > 0) {
        listed.push(hostname.trim());
      }
    } catch {
      // DNSBL lookup failed, skip
    }
  }

  return { listed: listed.length > 0, services: listed };
};
