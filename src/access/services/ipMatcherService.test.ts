import { describe, it, expect } from "vitest";

import { ipMatchesCidr } from "./ipMatcherService";

describe("ipMatchesCidr", () => {
  it("同一IPで一致すること", () => {
    const result = ipMatchesCidr("192.168.1.1", "192.168.1.1");

    expect(result).toBe(true);
  });

  it("異なるIPで不一致になること", () => {
    const result = ipMatchesCidr("192.168.1.2", "192.168.1.1");

    expect(result).toBe(false);
  });

  it("/24のCIDR範囲内で一致すること", () => {
    const result = ipMatchesCidr("192.168.1.100", "192.168.1.0/24");

    expect(result).toBe(true);
  });

  it("/24のCIDR範囲外で不一致になること", () => {
    const result = ipMatchesCidr("192.168.2.100", "192.168.1.0/24");

    expect(result).toBe(false);
  });

  it("/16のCIDR範囲内で一致すること", () => {
    const result = ipMatchesCidr("192.168.100.1", "192.168.0.0/16");

    expect(result).toBe(true);
  });

  it("/32のCIDR範囲内で一致すること", () => {
    const result = ipMatchesCidr("10.0.0.1", "10.0.0.1/32");

    expect(result).toBe(true);
  });

  it("/0のCIDRはすべてのIPに一致すること", () => {
    const result = ipMatchesCidr("1.2.3.4", "0.0.0.0/0");

    expect(result).toBe(true);
  });

  it("CIDR形式でない場合はfalseを返すこと", () => {
    const result = ipMatchesCidr("192.168.1.1", "not-a-cidr");

    expect(result).toBe(false);
  });

  it("不正なIPアドレスでfalseを返すこと", () => {
    const result = ipMatchesCidr("not-an-ip", "192.168.1.0/24");

    expect(result).toBe(false);
  });

  it("不正なCIDRビット数でfalseを返すこと", () => {
    const result = ipMatchesCidr("192.168.1.1", "192.168.1.0/33");

    expect(result).toBe(false);
  });

  it("不正なCIDRのIPでfalseを返すこと", () => {
    const result = ipMatchesCidr("192.168.1.1", "invalid/24");

    expect(result).toBe(false);
  });
});
