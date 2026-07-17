"use client";
import { useState, useEffect } from "react";
import ChatBot from "@/components/ChatBot";

interface JobMatch {
  id: string;
  job_id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
  score: number;
  match_reasons: string[];
  concerns: string[];
  status: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [selected, setSelected] = useState<JobMatch | null>(null);
  const [searching, setSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jobs/search?status=new")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs || []);
        if (d.jobs?.length) setSelected(d.jobs[0]);
        setLoaded(true);
      });
  }, []);

  async function runSearch() {
    setSearching(true);
    setError("");
    const res = await fetch("/api/jobs/search", { method: "POST" });
    const data = await res.json();
    setSearching(false);
    if (!res.ok) {
      setError(data.error || "Search failed");
      return;
    }
    const merged = [...data.jobs, ...jobs.filter((j) => !data.jobs.find((n: JobMatch) => n.id === j.id))];
    setJobs(merged);
    if (!selected && data.jobs.length) setSelected(data.jobs[0]);
  }

  async function updateStatus(matchId: string, status: string) {
    await fetch(`/api/jobs/${matchId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setJobs((prev) => prev.filter((j) => j.id !== matchId));
    setSelected((prev) => {
      if (!prev || prev.id !== matchId) return prev;
      const remaining = jobs.filter((j) => j.id !== matchId);
      return remaining[0] || null;
    });
  }

  return (
    <div className="w-full max-w-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Job matches</h1>
          <p className="text-sm text-gray-500">{jobs.length} jobs found</p>
        </div>
        <button
          onClick={runSearch}
          disabled={searching}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search jobs"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {!loaded && <p className="text-sm text-gray-400">Loading…</p>}

      {loaded && jobs.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p className="mb-3">No jobs yet.</p>
          <button
            onClick={runSearch}
            disabled={searching}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? "Searching…" : "Find jobs now"}
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Job list */}
          <div className="w-72 shrink-0 overflow-y-auto space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelected(job)}
                className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                  selected?.id === job.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-medium leading-snug">{job.title}</p>
                  <span
                    className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                      job.score >= 75
                        ? "bg-green-100 text-green-700"
                        : job.score >= 50
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {job.score}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{job.company}</p>
                <p className="text-xs text-gray-400">{job.location}</p>
              </button>
            ))}
          </div>

          {/* Job detail + chatbot */}
          {selected && (
            <div className="flex-1 flex gap-4 min-w-0 overflow-hidden">
              {/* Detail */}
              <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.title}</h2>
                    <p className="text-sm text-gray-600">
                      {selected.company} · {selected.location}
                    </p>
                    {(selected.salary_min || selected.salary_max) && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {selected.salary_min && `CA$${selected.salary_min.toLocaleString()}`}
                        {selected.salary_min && selected.salary_max && " – "}
                        {selected.salary_max && `CA$${selected.salary_max.toLocaleString()}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(selected.id, "saved")}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:border-blue-400 hover:text-blue-600"
                    >
                      Save
                    </button>
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                    >
                      Open on LinkedIn ↗
                    </a>
                    <button
                      onClick={() => updateStatus(selected.id, "dismissed")}
                      className="px-3 py-1.5 border border-red-200 text-red-400 rounded-lg text-xs hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Match info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                  <p className="font-medium text-xs text-gray-500 uppercase tracking-wide">
                    Match score: {selected.score}/100
                  </p>
                  {selected.match_reasons.length > 0 && (
                    <ul className="space-y-1">
                      {selected.match_reasons.map((r, i) => (
                        <li key={i} className="flex gap-2 text-xs text-green-700">
                          <span>✓</span> {r}
                        </li>
                      ))}
                    </ul>
                  )}
                  {selected.concerns.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {selected.concerns.map((c, i) => (
                        <li key={i} className="flex gap-2 text-xs text-amber-600">
                          <span>!</span> {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selected.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => updateStatus(selected.id, "applied")}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    ✓ Mark as applied
                  </button>
                </div>
              </div>

              {/* Chatbot */}
              <div className="w-80 shrink-0">
                <ChatBot jobMatchId={selected.id} jobTitle={selected.title} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
