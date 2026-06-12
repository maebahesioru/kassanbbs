import { describe, it, expect } from "vitest";

import { parseReadOption } from "./optionParserService";

describe("parseReadOption", () => {
  it("l50で最新50件を取得すること", () => {
    const result = parseReadOption("l50");

    expect(result.isLast).toBe(true);
    expect(result.start).toBe(50);
    expect(result.end).toBe(50);
    expect(result.hideFirst).toBe(false);
  });

  it("l50nで最新50件を非表示で取得すること", () => {
    const result = parseReadOption("l50n");

    expect(result.isLast).toBe(true);
    expect(result.start).toBe(51);
    expect(result.end).toBe(51);
    expect(result.hideFirst).toBe(true);
  });

  it("1-100で範囲指定できること", () => {
    const result = parseReadOption("1-100");

    expect(result.isLast).toBe(false);
    expect(result.start).toBe(1);
    expect(result.end).toBe(100);
    expect(result.hideFirst).toBe(false);
  });

  it("1-100nで範囲指定+非表示にできること", () => {
    const result = parseReadOption("1-100n");

    expect(result.start).toBe(1);
    expect(result.end).toBe(100);
    expect(result.hideFirst).toBe(true);
  });

  it("100-で開始位置指定ができること", () => {
    const result = parseReadOption("100-");

    expect(result.start).toBe(100);
    expect(result.end).toBe(-1);
    expect(result.hideFirst).toBe(false);
  });

  it("100-nで開始位置指定+非表示にできること", () => {
    const result = parseReadOption("100-n");

    expect(result.start).toBe(100);
    expect(result.end).toBe(-1);
    expect(result.hideFirst).toBe(true);
  });

  it("-50で終了位置指定ができること", () => {
    const result = parseReadOption("-50");

    expect(result.start).toBe(1);
    expect(result.end).toBe(50);
    expect(result.hideFirst).toBe(false);
  });

  it("50で単一レスを取得できること", () => {
    const result = parseReadOption("50");

    expect(result.isSingle).toBe(true);
    expect(result.start).toBe(50);
    expect(result.end).toBe(50);
    expect(result.hideFirst).toBe(true);
  });

  it("50nで単一レスを非表示で取得できること", () => {
    const result = parseReadOption("50n");

    expect(result.isSingle).toBe(true);
    expect(result.start).toBe(50);
    expect(result.end).toBe(50);
    expect(result.hideFirst).toBe(true);
  });

  it("空文字列はデフォルト値になること", () => {
    const result = parseReadOption("");

    expect(result.isLast).toBe(false);
    expect(result.start).toBe(-1);
    expect(result.end).toBe(-1);
  });

  it("無効なオプションはデフォルト値になること", () => {
    const result = parseReadOption("invalid");

    expect(result.isLast).toBe(false);
    expect(result.start).toBe(-1);
    expect(result.end).toBe(-1);
  });

  it("nullは空文字列として扱われること", () => {
    const result = parseReadOption(null as unknown as string);

    expect(result.isLast).toBe(false);
    expect(result.start).toBe(-1);
    expect(result.end).toBe(-1);
  });
});
