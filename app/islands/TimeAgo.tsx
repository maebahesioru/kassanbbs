import { useEffect } from "hono/jsx";

export default function TimeAgo() {
  useEffect(() => {
    const timeAgo = (unixTimestamp: number): string => {
      const now = Date.now();
      const diff = Math.floor((now - unixTimestamp * 1000) / 1000);
      if (diff < 60) return `${diff}秒前`;
      if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
      if (diff < 2592000) return `${Math.floor(diff / 86400)}日前`;
      return `${Math.floor(diff / 2592000)}ヶ月前`;
    };

    const update = () => {
      document.querySelectorAll("[data-mtime]").forEach((el) => {
        const mtime = parseInt(el.getAttribute("data-mtime") || "0", 10);
        if (mtime > 0) {
          (el as HTMLElement).textContent = timeAgo(mtime);
        }
      });
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
