"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SENIORITY_OPTIONS = ["junior", "mid", "senior", "lead", "any"];
const REMOTE_OPTIONS = ["remote", "hybrid", "on-site", "any"];
const JOB_TYPE_OPTIONS = ["full-time", "part-time", "contract", "internship"];

export default function PreferencesPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [remote, setRemote] = useState("hybrid");
  const [seniority, setSeniority] = useState("any");
  const [salaryMin, setSalaryMin] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>(["full-time"]);
  const [visaRequired, setVisaRequired] = useState(false);
  const [willingToRelocate, setWillingToRelocate] = useState(false);

  useEffect(() => {
    fetch("/api/profile/preferences")
      .then((r) => r.json())
      .then(({ preferences: p }) => {
        if (!p) return;
        setLocations(JSON.parse(p.locations_json || "[]"));
        setRemote(p.remote_preference || "hybrid");
        setSeniority(p.seniority || "any");
        setSalaryMin(p.salary_min ? String(p.salary_min) : "");
        setJobTypes(JSON.parse(p.job_types_json || '["full-time"]'));
        setVisaRequired(!!p.visa_required);
        setWillingToRelocate(!!p.willing_to_relocate);
      });
  }, []);

  function addLocation() {
    const v = locationInput.trim();
    if (v && !locations.includes(v)) {
      setLocations([...locations, v]);
    }
    setLocationInput("");
  }

  function toggleJobType(type: string) {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await fetch("/api/profile/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations,
        remote_preference: remote,
        seniority: seniority === "any" ? null : seniority,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        job_types: jobTypes,
        visa_required: visaRequired,
        willing_to_relocate: willingToRelocate,
      }),
    });

    setSaving(false);
    router.push("/jobs");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-1">Job preferences</h1>
      <p className="text-gray-500 text-sm mb-6">Tell us what you&apos;re looking for.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-2">Preferred locations</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
              placeholder="e.g. New York, London"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addLocation}
              className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
            >
              Add
            </button>
          </div>
          {locations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                >
                  {loc}
                  <button
                    type="button"
                    onClick={() => setLocations(locations.filter((l) => l !== loc))}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Remote */}
        <div>
          <label className="block text-sm font-medium mb-2">Work arrangement</label>
          <div className="flex gap-2 flex-wrap">
            {REMOTE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRemote(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  remote === opt
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Seniority */}
        <div>
          <label className="block text-sm font-medium mb-2">Seniority level</label>
          <div className="flex gap-2 flex-wrap">
            {SENIORITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSeniority(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  seniority === opt
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Job types */}
        <div>
          <label className="block text-sm font-medium mb-2">Job type</label>
          <div className="flex gap-2 flex-wrap">
            {JOB_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleJobType(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  jobTypes.includes(opt)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Salary */}
        <div>
          <label className="block text-sm font-medium mb-2">Minimum salary (annual, CAD)</label>
          <input
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="e.g. 80000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={visaRequired}
              onChange={(e) => setVisaRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-blue-600"
            />
            <span className="text-sm">I need visa sponsorship</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={willingToRelocate}
              onChange={(e) => setWillingToRelocate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-blue-600"
            />
            <span className="text-sm">I&apos;m willing to relocate</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Find jobs →"}
        </button>
      </form>
    </div>
  );
}
