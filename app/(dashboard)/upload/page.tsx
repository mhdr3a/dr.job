"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Resume {
  id: string;
  file_name: string;
  created_at: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/resume/upload")
      .then((r) => r.json())
      .then((d) => setResumes(d.resumes || []));
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setStatus("Uploading and parsing with AI…");
    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/resume/upload", { method: "POST", body: form });
    setUploading(false);

    let data: { ok?: boolean; error?: string; warning?: string } = {};
    try { data = await res.json(); } catch { /* empty body on 500 */ }

    if (!res.ok) {
      setError(data.error || "Upload failed. Please try again.");
      setStatus("");
      return;
    }

    setStatus("CV parsed successfully!");
    const updated = await fetch("/api/resume/upload").then((r) => r.json());
    setResumes(updated.resumes || []);
    e.target.value = "";
  }

  async function deleteResume(id: string) {
    await fetch(`/api/resume/upload?id=${id}`, { method: "DELETE" });
    setResumes((prev) => prev.filter((r) => r.id !== id));
  }

  function continueToSwipe() {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(() => router.push("/swipe"));
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-1">Upload your CV</h1>
      <p className="text-gray-500 text-sm mb-6">
        Upload up to 2 CVs. We&apos;ll extract your experience and skills automatically.
      </p>

      {resumes.length < 2 && (
        <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors mb-4">
          <input
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          {uploading ? (
            <span className="text-sm text-gray-500">Processing…</span>
          ) : (
            <>
              <div className="text-2xl mb-2">📄</div>
              <p className="text-sm text-gray-600">Click to upload a PDF or TXT file</p>
              <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
            </>
          )}
        </label>
      )}

      {status && <p className="text-sm text-green-600 mb-3">{status}</p>}
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {resumes.length > 0 && (
        <div className="space-y-2 mb-6">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{r.file_name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteResume(r.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {resumes.length > 0 && (
        <button
          onClick={continueToSwipe}
          className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Continue →
        </button>
      )}
    </div>
  );
}
