export const verifyHcaptchaToken = async (token: string, secretKey: string): Promise<boolean> => {
  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });
    const data = await response.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
};
