import { describe, it, expect } from "vitest";

import { convertUrl, convertMovie, convertQuotation, convertAll } from "./contentConverterService";

describe("contentConverterService", () => {
  describe("convertUrl", () => {
    it("URLをリンクに変換すること", () => {
      const result = convertUrl("Visit https://example.com", {});

      expect(result).toContain('<a href="https://example.com" target="_blank">');
    });

    it("モバイルモードでは短縮URLとして変換すること", () => {
      const result = convertUrl("Visit https://example.com", { isMobile: true });

      expect(result).toContain("<a");
      expect(result).not.toContain("target=\"_blank\"");
    });

    it("クッションがある場合クッション付きリンクになること", () => {
      const result = convertUrl("Visit https://example.com", {
        cushion: "jump.x0.to/",
        server: "https://myserver.com",
      });

      expect(result).toContain("cushion");
    });

    it("URLがないテキストは変更されないこと", () => {
      const result = convertUrl("普通のテキストです", {});

      expect(result).toBe("普通のテキストです");
    });
  });

  describe("convertMovie", () => {
    it("YouTubeショートURLを埋め込みに変換すること", () => {
      const result = convertMovie("https://youtu.be/abc123DEF");

      expect(result).toContain("youtube.com/embed/abc123DEF");
    });

    it("YouTubeフルURLを埋め込みに変換すること", () => {
      const result = convertMovie("https://www.youtube.com/watch?v=abc123DEF");

      expect(result).toContain("youtube.com/embed/abc123DEF");
    });

    it("ニコニコ動画URLを埋め込みに変換すること", () => {
      const result = convertMovie("https://nico.ms/sm12345678");

      expect(result).toContain("embed.nicovideo.jp/watch/sm12345678");
    });

    it("動画URLがないテキストは変更されないこと", () => {
      const result = convertMovie("普通のテキストです");

      expect(result).toBe("普通のテキストです");
    });
  });

  describe("convertQuotation", () => {
    const options = {
      server: "https://example.com",
      cgiPath: "/test",
      bbs: "testbbs",
      key: "12345",
    };

    it("単一引用をリンクに変換すること", () => {
      const result = convertQuotation(">>123", options);

      expect(result).toContain("reply_link");
      expect(result).toContain("123");
    });

    it("範囲引用をリンクに変換すること", () => {
      const result = convertQuotation(">>1-10", options);

      expect(result).toContain("reply_link");
    });

    it("usePathInfoがtrueの場合パス形式になること", () => {
      const result = convertQuotation(">>123", { ...options, usePathInfo: true });

      expect(result).toContain("/read.cgi/testbbs/12345/123");
    });

    it("引用がないテキストは変更されないこと", () => {
      const result = convertQuotation("普通のテキストです", options);

      expect(result).toBe("普通のテキストです");
    });
  });

  describe("convertAll", () => {
    it("全ての変換を適用すること", () => {
      const result = convertAll(
        "今日は>>1を見てね https://example.com 動画はこちら https://youtu.be/abc",
        {
          server: "https://example.com",
          cgiPath: "/test",
          bbs: "testbbs",
          key: "12345",
        }
      );

      expect(result).toContain("reply_link");
      expect(result).toContain("href=\"https://example.com\"");
    });

    it("空文字列は空のままであること", () => {
      const result = convertAll("", {
        server: "https://example.com",
        cgiPath: "/test",
        bbs: "testbbs",
        key: "12345",
      });

      expect(result).toBe("");
    });
  });
});
