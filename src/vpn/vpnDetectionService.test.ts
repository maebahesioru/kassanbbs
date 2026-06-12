import { describe, it, expect } from "vitest";

import { isVpnHostname } from "./vpnDetectionService";

describe("isVpnHostname", () => {
  it("NordVPNのホスト名を検出すること", () => {
    const result = isVpnHostname("client.nordvpn.com");

    expect(result).toBe(true);
  });

  it("Surfsharkのホスト名を検出すること", () => {
    const result = isVpnHostname("node.surfshark.com");

    expect(result).toBe(true);
  });

  it("Mullvadのホスト名を検出すること", () => {
    const result = isVpnHostname("relay.mullvad.net");

    expect(result).toBe(true);
  });

  it("Tor出口ノードを検出すること", () => {
    const result = isVpnHostname("tor-exit.node.example.com");

    expect(result).toBe(true);
  });

  it("VPN Gateを検出すること", () => {
    const result = isVpnHostname("vpngate.something.com");

    expect(result).toBe(true);
  });

  it("通常のキャリアホスト名はVPNと判定しないこと", () => {
    const result = isVpnHostname("user.docomo.ne.jp");

    expect(result).toBe(false);
  });

  it("通常のISPホスト名はVPNと判定しないこと", () => {
    const result = isVpnHostname("user.example.com");

    expect(result).toBe(false);
  });

  it("空文字列はVPNと判定しないこと", () => {
    const result = isVpnHostname("");

    expect(result).toBe(false);
  });

  it("ExpressVPNを検出すること", () => {
    const result = isVpnHostname("server.expressvpn.com");

    expect(result).toBe(true);
  });
});
