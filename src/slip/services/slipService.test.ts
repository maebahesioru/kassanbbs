import { describe, it, expect } from "vitest";

import { generateWattyoi, detectCarrier, detectAnonymousConnection } from "./slipService";

describe("slipService", () => {
  describe("detectCarrier", () => {
    it("docomoキャリアを検出すること", () => {
      const result = detectCarrier("user.docomo.ne.jp");

      expect(result.carrier).toBe("docomo");
      expect(result.type).toBe("mobile");
    });

    it("auキャリアを検出すること", () => {
      const result = detectCarrier("user.ezweb.ne.jp");

      expect(result.carrier).toBe("ezweb");
      expect(result.type).toBe("mobile");
    });

    it("SoftBankキャリアを検出すること", () => {
      const result = detectCarrier("user.softbank.ne.jp");

      expect(result.carrier).toBe("softbank");
      expect(result.type).toBe("mobile");
    });

    it("不明なホスト名の場合はunknownを返すこと", () => {
      const result = detectCarrier("unknown.host.com");

      expect(result.carrier).toBe("unknown");
      expect(result.nickname).toBe("ﾜｯﾁｮｲ");
      expect(result.type).toBe("unknown");
    });
  });

  describe("detectAnonymousConnection", () => {
    it("VPN Gateを検出すること", () => {
      const result = detectAnonymousConnection("host.vpngate.something");

      expect(result.isAnonymous).toBe(true);
      expect(result.type).toBe("VPN Gate");
    });

    it("Torを検出すること", () => {
      const result = detectAnonymousConnection("host.torproject.org");

      expect(result.isAnonymous).toBe(true);
      expect(result.type).toBe("Tor");
    });

    it("AWSを検出すること", () => {
      const result = detectAnonymousConnection("ec2.amazonaws.com");

      expect(result.isAnonymous).toBe(true);
      expect(result.type).toBe("AWS");
    });

    it("通常のホスト名は匿名と判定しないこと", () => {
      const result = detectAnonymousConnection("user.docomo.ne.jp");

      expect(result.isAnonymous).toBe(false);
      expect(result.type).toBe("");
    });
  });

  describe("generateWattyoi", () => {
    it("レベルvvvでニックネームのみ返すこと", () => {
      const result = generateWattyoi(
        "192.168.1.1",
        "user.docomo.ne.jp",
        "Mozilla/5.0",
        "secret-key",
        "vvv"
      );

      expect(result).toBe("ｵｯﾍﾟｹｰ");
    });

    it("レベルvvvvでIPプレフィックス付きで返すこと", () => {
      const result = generateWattyoi(
        "192.168.1.1",
        "unknown.host.com",
        "Mozilla/5.0",
        "secret-key",
        "vvvv"
      );

      expect(result).toContain("ﾜｯﾁｮｲ");
      expect(result).toContain("192.168.1.xxx");
    });

    it("匿名接続の場合は匿名タイプを表示すること", () => {
      const result = generateWattyoi(
        "192.168.1.1",
        "ec2.amazonaws.com",
        "Mozilla/5.0",
        "secret-key",
        "vvv"
      );

      expect(result).toBe("AWS");
    });

    it("デフォトレベルはvvvvvと同じ動作になること", () => {
      const result = generateWattyoi(
        "192.168.1.1",
        "unknown.host.com",
        "Mozilla/5.0",
        "secret-key",
        "unknown"
      );

      expect(result).toContain("ﾜｯﾁｮｲ");
    });
  });
});
