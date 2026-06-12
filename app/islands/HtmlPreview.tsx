export default function HtmlPreview({ html, id }: { html: string; id: string }) {
  return (
    <div>
      <button onClick={() => {
        const preview = document.getElementById(`preview-${id}`);
        if (preview) {
          preview.innerHTML = html;
          preview.classList.toggle("hidden");
        }
      }} className="text-sm text-blue-600 hover:text-blue-800">プレビュー</button>
      <div id={`preview-${id}`} className="hidden border p-4 mt-2 bg-white rounded"></div>
    </div>
  );
}
