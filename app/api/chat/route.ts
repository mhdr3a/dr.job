import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";
import { chat } from "@/lib/ai/client";

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { question, job_match_id, messages } = await req.json();

  if (!question) {
    return NextResponse.json({ error: "Question required" }, { status: 400 });
  }

  const profile = db
    .prepare("SELECT parsed_data_json, summary FROM user_profiles WHERE user_id = ?")
    .get(session.userId) as
    | { parsed_data_json: string; summary: string }
    | undefined;

  let jobContext = "";
  if (job_match_id) {
    const match = db
      .prepare(`
        SELECT j.title, j.company, j.description
        FROM job_matches jm
        JOIN jobs j ON j.id = jm.job_id
        WHERE jm.id = ? AND jm.user_id = ?
      `)
      .get(job_match_id, session.userId) as
      | { title: string; company: string; description: string }
      | undefined;

    if (match) {
      jobContext = `\nJob: ${match.title} at ${match.company}\nJob description (excerpt): ${match.description.slice(0, 500)}`;
    }
  }

  const parsedProfile = profile?.parsed_data_json
    ? JSON.parse(profile.parsed_data_json)
    : {};

  const systemPrompt = `You are a job application assistant helping a candidate craft strong, honest answers to application questions.
Help refine and improve the candidate's answers. Keep answers professional and concise. Highlight relevant experience from their background. Do not fabricate experience.

Candidate background:
Summary: ${profile?.summary || "Not provided"}
Skills: ${JSON.stringify(parsedProfile.skills || {})}
Experience: ${JSON.stringify((parsedProfile.experience || []).slice(0, 3))}
${jobContext}`;

  const allMessages = [
    { role: "system" as const, content: systemPrompt },
    ...(messages || []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: question },
  ];

  const answer = await chat(allMessages, { temperature: 0.7, max_tokens: 500 });
  return NextResponse.json({ answer });
}
