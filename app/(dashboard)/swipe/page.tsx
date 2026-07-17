"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SwipeCard from "@/components/SwipeCard";

type Phase = "skills" | "job_titles" | "done";

interface SkillItem {
  id: string;
  skill_name: string;
  skill_type: string;
  status: string;
}

interface TitleItem {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function SwipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("skills");

  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [skillIdx, setSkillIdx] = useState(0);
  const [titleIdx, setTitleIdx] = useState(0);

  useEffect(() => {
    fetch("/api/profile/swipe")
      .then((r) => r.json())
      .then((data) => {
        setSkills(data.skills || []);
        setTitles(data.job_titles || []);
        setLoading(false);
      });
  }, []);

  async function swipeSkill(id: string, status: "liked" | "disliked") {
    await fetch("/api/profile/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "skill", id, status }),
    });

    const next = skillIdx + 1;
    if (next >= skills.length) {
      setPhase("job_titles");
    } else {
      setSkillIdx(next);
    }
  }

  async function swipeTitle(id: string, status: "liked" | "disliked") {
    await fetch("/api/profile/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "job_title", id, status }),
    });

    const next = titleIdx + 1;
    if (next >= titles.length) {
      setPhase("done");
    } else {
      setTitleIdx(next);
    }
  }

  async function finish() {
    await fetch("/api/profile/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "finish" }),
    });
    router.push("/preferences");
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (skills.length === 0 && titles.length === 0) {
    return (
      <div className="max-w-sm">
        <p className="text-gray-500 text-sm mb-4">
          No suggestions yet. Please upload a CV first.
        </p>
        <button
          onClick={() => router.push("/upload")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to upload
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      {phase === "skills" && skills.length > 0 && (
        <>
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Your skills</h1>
            <p className="text-sm text-gray-500 mt-1">
              Keep skills you want to use in your next role.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {skillIdx + 1} of {skills.length}
            </p>
          </div>
          <SwipeCard
            key={skills[skillIdx]?.id}
            title={skills[skillIdx]?.skill_name}
            badge={skills[skillIdx]?.skill_type}
            onLike={() => swipeSkill(skills[skillIdx].id, "liked")}
            onDislike={() => swipeSkill(skills[skillIdx].id, "disliked")}
          />
        </>
      )}

      {phase === "job_titles" && titles.length > 0 && (
        <>
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Job titles</h1>
            <p className="text-sm text-gray-500 mt-1">
              Select roles you&apos;d like to explore.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {titleIdx + 1} of {titles.length}
            </p>
          </div>
          <SwipeCard
            key={titles[titleIdx]?.id}
            title={titles[titleIdx]?.title}
            subtitle={titles[titleIdx]?.description}
            badge="Role"
            onLike={() => swipeTitle(titles[titleIdx].id, "liked")}
            onDislike={() => swipeTitle(titles[titleIdx].id, "disliked")}
          />
        </>
      )}

      {phase === "done" && (
        <div>
          <h1 className="text-xl font-semibold mb-2">All done!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Great choices. Now let&apos;s set your job preferences.
          </p>
          <button
            onClick={finish}
            className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Set preferences →
          </button>
        </div>
      )}
    </div>
  );
}
