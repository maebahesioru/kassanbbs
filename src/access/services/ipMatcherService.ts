export const ipMatchesCidr = (ip: string, cidr: string): boolean => {
  if (cidr === ip) return true;
  if (!cidr.includes("/")) return false;

  const [rangeIp, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;

  const ipToInt = (ipAddr: string): number => {
    const parts = ipAddr.split(".").map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return -1;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  };

  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(rangeIp);
  if (ipInt === -1 || rangeInt === -1) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
};
