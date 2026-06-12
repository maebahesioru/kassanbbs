export const processTasukeruyo = (
  name: string,
  params: { ip: string; host: string; userAgent: string }
): { name: string; contentAppend: string } => {
  if (name.trim().toLowerCase() === "tasukeruyo") {
    const info = `IP:${params.ip} HOST:${params.host} UA:${params.userAgent}`;
    return { name: info.substring(0, 100), contentAppend: "" };
  }
  return { name, contentAppend: "" };
};
