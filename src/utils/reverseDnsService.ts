export const reverseDnsLookup = async (ip: string): Promise<string | null> => {
  try {
    const reversed = ip.split(".").reverse().join(".");
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${reversed}.in-addr.arpa&type=PTR`,
      {
        headers: { "Accept": "application/dns-json" },
      }
    );
    const data = (await response.json()) as { Answer?: { data: string }[] };
    if (data.Answer && data.Answer.length > 0) {
      return data.Answer[0].data.replace(/\.$/, "");
    }
    return null;
  } catch {
    return null;
  }
};
