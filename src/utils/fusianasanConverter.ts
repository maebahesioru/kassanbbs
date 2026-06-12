export const convertFusianasan = (name: string, host: string): string => {
  if (host && host.trim()) {
    return `${name} <${host}>`;
  }
  return name;
};
