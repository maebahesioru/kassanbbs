import { useEffect } from "hono/jsx";

export default function MobileMenu() {
  useEffect(() => {
    const toggle = document.getElementById("mobile-menu-toggle");
    const menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    const onToggleClick = () => {
      menu.classList.toggle("hidden");
    };

    const onDocumentClick = (e: MouseEvent) => {
      if (!toggle.contains(e.target as Node) && !menu.contains(e.target as Node)) {
        menu.classList.add("hidden");
      }
    };

    toggle.addEventListener("click", onToggleClick);
    document.addEventListener("click", onDocumentClick);

    return () => {
      toggle.removeEventListener("click", onToggleClick);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  return null;
}
