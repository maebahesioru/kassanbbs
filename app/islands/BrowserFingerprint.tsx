import { useEffect } from "hono/jsx";

export default function BrowserFingerprint() {
  useEffect(() => {
    const fingerprint: Record<string, string> = {};

    try {
      fingerprint.cpuCores =
        navigator.hardwareConcurrency?.toString() || "unknown";
    } catch {
      fingerprint.cpuCores = "unknown";
    }

    fingerprint.platform = navigator.platform || "unknown";

    fingerprint.screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;

    fingerprint.timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";

    fingerprint.language = navigator.language || "unknown";

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("BrowserFingerprint!  <canvas> 1.0", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("BrowserFingerprint!  <canvas> 1.0", 4, 17);
        fingerprint.canvas = canvas.toDataURL().substring(0, 120);
      }
    } catch {
      fingerprint.canvas = "unsupported";
    }

    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          fingerprint.webglVendor =
            gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "unknown";
          fingerprint.webglRenderer =
            gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown";
        }
      }
    } catch {
      fingerprint.webgl = "unsupported";
    }

    const fpField = document.getElementById("browser-fp") as HTMLInputElement;
    if (fpField) {
      fpField.value = JSON.stringify(fingerprint);
    }
  }, []);

  return (
    <input type="hidden" id="browser-fp" name="browser_fp" value="" />
  );
}
