export const verifyTurnstileToken = async (token: string, secretKey: string): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const data = await response.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
};
