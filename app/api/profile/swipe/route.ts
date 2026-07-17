import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const skills = db
    .prepare("SELECT * FROM user_skill_preferences WHERE user_id = ?")
    .all(session.userId);

  const jobTitles = db
    .prepare("SELECT * FROM job_title_preferences WHERE user_id = ?")
    .all(session.userId);

  const profile = db
    .prepare("SELECT parsed_data_json FROM user_profiles WHERE user_id = ?")
    .get(session.userId) as { parsed_data_json: string } | undefined;

  let industries: string[] = [];
  if (profile?.parsed_data_json) {
    const parsed = JSON.parse(profile.parsed_data_json);
    industries = parsed.recommended_industries || [];
  }

  return NextResponse.json({ skills, job_titles: jobTitles, industries });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { type, id, status } = body as {
    type: "skill" | "job_title" | "finish";
    id?: string;
    status?: string;
  };

  if (type === "finish") {
    db.prepare(
      "UPDATE user_profiles SET onboarding_step = 'preferences' WHERE user_id = ?"
    ).run(session.userId);
    return NextResponse.json({ ok: true });
  }

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  if (type === "skill") {
    db.prepare(
      "UPDATE user_skill_preferences SET status = ? WHERE id = ? AND user_id = ?"
    ).run(status, id, session.userId);
  } else if (type === "job_title") {
    db.prepare(
      "UPDATE job_title_preferences SET status = ? WHERE id = ? AND user_id = ?"
    ).run(status, id, session.userId);
  }

  return NextResponse.json({ ok: true });
}
