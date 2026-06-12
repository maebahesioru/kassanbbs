import { useState } from "hono/jsx";

export default function ImageUploader({
  onImageUploaded,
}: {
  onImageUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (
    e: Event
  ) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json() as {
          url?: string;
          error?: string;
        };

        if (response.ok && data.url) {
          onImageUploaded(data.url);
        } else {
          setError(data.error || "アップロードに失敗しました");
        }
      } catch {
        setError("アップロード中にエラーが発生しました");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm text-gray-700 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          disabled={uploading}
        />
        {uploading && (
          <span className="text-sm text-gray-500">アップロード中...</span>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
