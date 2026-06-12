import { describe, it, expect } from "vitest";

import { createReadNgWord, createReadNgWordId, createReadNgWordWord } from "./ReadNgWord";

describe("ReadNgWord", () => {
  describe("createReadNgWordId", () => {
    it("有効なIDで作成できること", () => {
      const result = createReadNgWordId("abc123");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("abc123");
      }
    });

    it("空文字列のIDはエラーになること", () => {
      const result = createReadNgWordId("");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("NGワードIDが不正です");
      }
    });

    it("nullはエラーになること", () => {
      const result = createReadNgWordId(null as unknown as string);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("NGワードIDが不正です");
      }
    });
  });

  describe("createReadNgWordWord", () => {
    it("有効な単語で作成できること", () => {
      const result = createReadNgWordWord("badword");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("badword");
      }
    });

    it("空白の単語はトリムされること", () => {
      const result = createReadNgWordWord("  badword  ");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("badword");
      }
    });

    it("空文字列の単語はエラーになること", () => {
      const result = createReadNgWordWord("");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("NGワードが空です");
      }
    });

    it("空白のみの単語はエラーになること", () => {
      const result = createReadNgWordWord("   ");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("NGワードが空です");
      }
    });
  });

  describe("createReadNgWord", () => {
    it("有効なパラメータで作成できること", () => {
      const result = createReadNgWord({ id: "abc123", word: "badword" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value._type).toBe("ReadNgWord");
        expect(result.value.id).toBe("abc123");
        expect(result.value.word).toBe("badword");
      }
    });

    it("無効なIDでエラーになること", () => {
      const result = createReadNgWord({ id: "", word: "badword" });

      expect(result.isErr()).toBe(true);
    });

    it("無効な単語でエラーになること", () => {
      const result = createReadNgWord({ id: "abc123", word: "" });

      expect(result.isErr()).toBe(true);
    });
  });
});
