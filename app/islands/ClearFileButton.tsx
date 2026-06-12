import { useEffect } from "hono/jsx";

export default function ClearFileButton() {
  useEffect(() => {
    const handlers: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];

    document.querySelectorAll("input[type='file']").forEach((input) => {
      const fileInput = input as HTMLInputElement;
      const clearBtn = fileInput.nextElementSibling;
      if (!clearBtn || !clearBtn.classList.contains("clear-file-btn")) return;

      const onChange = () => {
        (clearBtn as HTMLElement).classList.toggle("hidden", !fileInput.files?.length);
      };

      const onClear = () => {
        fileInput.value = "";
        (clearBtn as HTMLElement).classList.add("hidden");
      };

      fileInput.addEventListener("change", onChange);
      clearBtn.addEventListener("click", onClear);
      handlers.push({ el: fileInput, type: "change", handler: onChange });
      handlers.push({ el: clearBtn as HTMLElement, type: "click", handler: onClear });
    });

    return () => {
      for (const h of handlers) {
        h.el.removeEventListener(h.type, h.handler);
      }
    };
  }, []);

  return null;
}
