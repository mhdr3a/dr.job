"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error("not logged in");
      })
      .then((user) => {
        const step = user.onboarding_step;
        if (step === "upload") router.replace("/upload");
        else if (step === "swipe") router.replace("/swipe");
        else if (step === "preferences") router.replace("/preferences");
        else router.replace("/jobs");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  );
}
