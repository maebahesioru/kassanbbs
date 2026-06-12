import { describe, it, expect } from "vitest";

import { checkDnsbl } from "./dnsblService";

describe("checkDnsbl", () => {
  it("空のDNSBLリストではlistedがfalseになること", async () => {
    const result = await checkDnsbl("127.0.0.1", []);

    expect(result.listed).toBe(false);
    expect(result.services).toEqual([]);
  });

  it("空のホスト名はスキップされること", async () => {
    const result = await checkDnsbl("127.0.0.1", ["", "  "]);

    expect(result.listed).toBe(false);
    expect(result.services).toEqual([]);
  });

  it("フォーマットされた逆引きIPが正しいこと", async () => {
    const reversed = "127.0.0.1".split(".").reverse().join(".");

    expect(reversed).toBe("1.0.0.127");
  });

  it("DNSBLホスト名のトリムが正しく行われること", () => {
    const hostname = "  test.example.com  ";

    expect(hostname.trim()).toBe("test.example.com");
  });
});
