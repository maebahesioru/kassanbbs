import { describe, it, expect } from "vitest";

import { generateTrip } from "./tripService";

describe("generateTrip", () => {
  it("空の鍵は空文字列を返すこと", () => {
    const result = generateTrip("");

    expect(result).toBe("");
  });

  it("短い鍵でトリップが生成されること", () => {
    const result = generateTrip("test123");

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("同じ鍵から同じトリップが生成されること", () => {
    const result1 = generateTrip("testkey");
    const result2 = generateTrip("testkey");

    expect(result1).toBe(result2);
  });

  it("異なる鍵から異なるトリップが生成されること", () => {
    const result1 = generateTrip("key1");
    const result2 = generateTrip("key2");

    expect(result1).not.toBe(result2);
  });

  it("カラム数を指定できること", () => {
    const result = generateTrip("testkey", 12);

    expect(result.length).toBeLessThanOrEqual(12);
  });

  it("#で始まる鍵は異なるトリップ方式になること", () => {
    const result = generateTrip("#testkey");

    expect(result).toBeTruthy();
  });
});
