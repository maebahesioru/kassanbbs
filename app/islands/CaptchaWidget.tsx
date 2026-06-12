import { useEffect } from "hono/jsx";

export default function CaptchaWidget({ siteKey, provider }: { siteKey: string; provider?: string }) {
  const p = provider || "turnstile";

  useEffect(() => {
    if (p === "turnstile") {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (p === "recaptcha") {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (p === "hcaptcha") {
      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  if (p === "turnstile") {
    return <div className="cf-turnstile" data-sitekey={siteKey}></div>;
  }
  if (p === "recaptcha") {
    return (
      <>
        <div className="g-recaptcha" data-sitekey={siteKey}></div>
        <input type="hidden" name="g-recaptcha-response" value="" />
      </>
    );
  }
  if (p === "hcaptcha") {
    return <div className="h-captcha" data-sitekey={siteKey}></div>;
  }
  return <div className="cf-turnstile" data-sitekey={siteKey}></div>;
}
