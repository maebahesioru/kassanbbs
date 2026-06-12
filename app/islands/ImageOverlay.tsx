import { useEffect } from "hono/jsx";

export default function ImageOverlay() {
  useEffect(() => {
    const overlay = document.getElementById("image-overlay");
    const overlayImg = document.getElementById("overlay-image") as HTMLImageElement;
    if (!overlay || !overlayImg) return;

    const showOverlay = (src: string) => {
      overlayImg.src = src;
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
    };

    const hideOverlay = () => {
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.closest(".post-content")) {
        const src = target.getAttribute("src");
        if (src) showOverlay(src);
      }
    };

    const onOverlayClick = (e: MouseEvent) => {
      if (e.target === overlay) hideOverlay();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideOverlay();
    };

    document.addEventListener("click", onClick);
    overlay.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("click", onClick);
      overlay.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div id="image-overlay" className="hidden fixed inset-0 bg-black bg-opacity-80 z-50 items-center justify-center">
      <img id="overlay-image" className="max-w-[90vw] max-h-[90vh] object-contain cursor-pointer" alt="" />
    </div>
  );
}
