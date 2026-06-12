export const getIpCountry = async (ip: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://ip-api.com/json/${ip}?fields=countryCode`
    );
    const data = (await response.json()) as { countryCode?: string };
    return data.countryCode || null;
  } catch {
    return null;
  }
};
