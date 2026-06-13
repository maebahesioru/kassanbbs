import { useEffect, useState } from "hono/jsx";

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      const val = stored === "true";
      setIsDark(val);
      document.documentElement.classList.toggle("dark", val);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("darkMode", String(next));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-sm px-2 py-1 rounded hover:opacity-80 transition-opacity border border-current"
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
    >
      {isDark ? "☀ 明" : "☾ 暗"}
    </button>
  );
}
