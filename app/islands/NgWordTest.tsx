import { useState } from "hono/jsx";

export default function NgWordTest({ words }: { words: string[] }) {
  const [text, setText] = useState("");
  const [matchedWords, setMatchedWords] = useState<string[]>([]);
  const [highlightedHtml, setHighlightedHtml] = useState("");

  const handleTest = () => {
    if (!text || words.length === 0) {
      setMatchedWords([]);
      setHighlightedHtml("");
      return;
    }
    const matched: string[] = [];
    let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    for (const w of words) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp("(" + escaped + ")", "gi");
      if (regex.test(text)) {
        matched.push(w);
      }
      html = html.replace(
        regex,
        (match: string) =>
          `<span style="background-color:#fecaca;color:#991b1b;font-weight:bold;padding:0 2px;border-radius:3px">${match}</span>`
      );
    }
    setMatchedWords(matched);
    setHighlightedHtml(html);
  };

  return (
    <div>
      <textarea
        className="border border-gray-400 rounded p-2 w-full h-32 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
        placeholder="テストするテキストを入力..."
        value={text}
        onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
      ></textarea>
      <button
        onClick={handleTest}
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        テスト
      </button>
      {highlightedHtml && (
        <div className="mt-4">
          <p className="mb-2">
            マッチしたNGワード: <strong>{matchedWords.join(", ") || "なし"}</strong> ({matchedWords.length}件)
          </p>
          <div
            className="border rounded p-3 bg-gray-50 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>
      )}
    </div>
  );
}