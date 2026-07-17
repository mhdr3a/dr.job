"use client";
import { useState, useEffect } from "react";

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  status: string;
  created_at: string;
}

const TABS = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "dismissed", label: "Removed" },
];

export default function SavedPage() {
  const [tab, setTab] = useState("saved");
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/jobs/search?status=${tab}`)
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs || []);
        setLoading(false);
      });
  }, [tab]);

  async function updateStatus(matchId: string, status: string) {
    await fetch(`/api/jobs/${matchId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setJobs((prev) => prev.filter((j) => j.id !== matchId));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">My jobs</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && jobs.length === 0 && (
        <p className="text-sm text-gray-400">No jobs here yet.</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white border border-gray-200 rounded-xl px-4 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{job.title}</p>
              <p className="text-xs text-gray-500">{job.company} · {job.location}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  job.score >= 75
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {job.score}
              </span>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Open ↗
              </a>
              {tab === "saved" && (
                <button
                  onClick={() => updateStatus(job.id, "applied")}
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  Applied ✓
                </button>
              )}
              {tab !== "dismissed" && (
                <button
                  onClick={() => updateStatus(job.id, "dismissed")}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
              {tab === "dismissed" && (
                <button
                  onClick={() => updateStatus(job.id, "new")}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
