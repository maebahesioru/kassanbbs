const vpnPatterns = [
  /nordvpn/i, /surfshark/i, /mullvad/i, /expressvpn/i, /protonvpn/i, /purevpn/i,
  /cyberghost/i, /hidemyass/i, /privateinternetaccess/i, /vyprvpn/i, /ipvanish/i,
  /windscribe/i, /tunnelbear/i, /hotspotshield/i, /vpn\.(microsoft|azure|aws)/i,
  /tor-exit/i, /tor\.exit/i, /tor-relay/i,
  /avastvpn/i, /avast\.com/i,
  /privatevpn/i, /pvdata\.host/i,
  /vpngate/i,
  /temokvpn/i, /temokvpn\.com/i,
  /safervpn/i, /safervpn\.com/i,
  /ivacyvpn/i, /ivacy\.net/i, /dns2use\.com/i,
  /fastestvpn/i, /jumptoserver\.com/i,
  /iproproxy/i, /connectipro\.com/i,
  /pointtoserver/i, /ptoserver/i,
  /millenvpn/i, /me77\.me/i,
];

export const isVpnHostname = (hostname: string): boolean => {
  return vpnPatterns.some(pattern => pattern.test(hostname));
};
