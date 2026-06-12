import { describe, it, expect } from "vitest";

import { generateBbsId } from "./idGenerationService";

describe("generateBbsId", () => {
  const baseParams = {
    server: "example.com",
    bbs: "testbbs",
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0",
    provider: "docomo.ne.jp",
    date: new Date("2025-04-07T12:00:00Z"),
  };

  it("同一パラメータで同じIDが生成されること", () => {
    const id1 = generateBbsId(baseParams);
    const id2 = generateBbsId(baseParams);

    expect(id1).toBe(id2);
  });

  it("異なるIPで異なるIDが生成されること", () => {
    const id1 = generateBbsId(baseParams);
    const id2 = generateBbsId({ ...baseParams, ip: "192.168.1.200" });

    expect(id1).not.toBe(id2);
  });

  it("異なる日付で異なるIDが生成されること", () => {
    const id1 = generateBbsId(baseParams);
    const id2 = generateBbsId({
      ...baseParams,
      date: new Date("2025-04-08T12:00:00Z"),
    });

    expect(id1).not.toBe(id2);
  });

  it("指定したカラム数でIDが生成されること", () => {
    const id = generateBbsId(baseParams, 12);

    expect(id.length).toBe(12);
  });

  it("デフォルトのカラム数は8であること", () => {
    const id = generateBbsId(baseParams);

    expect(id.length).toBe(8);
  });

  it("IPv6アドレスでもIDが生成されること", () => {
    const id = generateBbsId({
      ...baseParams,
      ip: "2001:db8::1",
    });

    expect(id).toBeTruthy();
    expect(id.length).toBe(8);
  });

  it("providerが空でもIDが生成されること", () => {
    const id = generateBbsId({
      ...baseParams,
      provider: "",
    });

    expect(id).toBeTruthy();
    expect(id.length).toBe(8);
  });

  it("sessionIdがあると安定したIDになること", () => {
    const id1 = generateBbsId({ ...baseParams, sessionId: "session123" });
    const id2 = generateBbsId({
      ...baseParams,
      sessionId: "session123",
      ip: "10.0.0.1",
    });

    expect(id1).toBe(id2);
  });
});
