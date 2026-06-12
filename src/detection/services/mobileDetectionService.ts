export interface ClientInfo {
  isMobile: boolean;
  isSmartphone: boolean;
  isFeaturePhone: boolean;
  deviceName: string;
}

export const detectClientType = (userAgent: string): ClientInfo => {
  const ua = userAgent.toLowerCase();
  const isSmartphone =
    /iphone|ipod|android.*mobile|windows phone/i.test(ua);
  const isFeaturePhone =
    /docomo|au-|softbank|willcom|emobile/i.test(ua);
  const isMobile =
    isSmartphone || isFeaturePhone || /opera mini|opera mobi/i.test(ua);

  let deviceName = "PC";
  if (/iphone/i.test(ua)) deviceName = "iPhone";
  else if (/ipad/i.test(ua)) deviceName = "iPad";
  else if (/android/i.test(ua)) deviceName = "Android";
  else if (/docomo/i.test(ua)) deviceName = "DoCoMo";
  else if (/au-/i.test(ua)) deviceName = "au";
  else if (/softbank/i.test(ua)) deviceName = "SoftBank";

  return { isMobile, isSmartphone, isFeaturePhone, deviceName };
};
