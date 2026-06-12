import { describe, it, expect } from "vitest";

import { ErrorCodes } from "./completeErrorCodes";

describe("completeErrorCodes", () => {
  it("すべてのエラーコードがユニークであること", () => {
    const codes = Object.values(ErrorCodes).map((e) => e.code);
    const uniqueCodes = new Set(codes);

    expect(codes.length).toBe(uniqueCodes.size);
  });

  it("すべてのエラーコードが100以上であること", () => {
    const codes = Object.values(ErrorCodes).map((e) => e.code);

    codes.forEach((code) => {
      expect(code).toBeGreaterThanOrEqual(100);
    });
  });

  it("すべてのエラーコードが整数であること", () => {
    const codes = Object.values(ErrorCodes).map((e) => e.code);

    codes.forEach((code) => {
      expect(Number.isInteger(code)).toBe(true);
    });
  });

  it("すべてのエラーにメッセージが定義されていること", () => {
    Object.values(ErrorCodes).forEach((error) => {
      expect(error.msg).toBeTruthy();
      expect(typeof error.msg).toBe("string");
    });
  });

  it("エラーコードが昇順で定義されていること", () => {
    const entries = Object.entries(ErrorCodes);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i][1].code).toBeGreaterThanOrEqual(entries[i - 1][1].code);
    }
  });

  it("各カテゴリのコード範囲が正しいこと", () => {
    const formCodes = Object.values(ErrorCodes).filter(
      (e) => e.code >= 100 && e.code <= 199
    );
    const threadCodes = Object.values(ErrorCodes).filter(
      (e) => e.code >= 200 && e.code <= 299
    );

    expect(formCodes.length).toBeGreaterThan(0);
    expect(threadCodes.length).toBeGreaterThan(0);
  });
});
