import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const prefs = db
    .prepare("SELECT * FROM job_search_preferences WHERE user_id = ?")
    .get(session.userId);

  return NextResponse.json({ preferences: prefs || null });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const {
    locations,
    remote_preference,
    job_types,
    salary_min,
    seniority,
    industries,
    visa_required,
    willing_to_relocate,
  } = body;

  const existing = db
    .prepare("SELECT id FROM job_search_preferences WHERE user_id = ?")
    .get(session.userId);

  if (existing) {
    db.prepare(`
      UPDATE job_search_preferences SET
        locations_json = ?,
        remote_preference = ?,
        job_types_json = ?,
        salary_min = ?,
        seniority = ?,
        industries_json = ?,
        visa_required = ?,
        willing_to_relocate = ?
      WHERE user_id = ?
    `).run(
      JSON.stringify(locations || []),
      remote_preference || "hybrid",
      JSON.stringify(job_types || ["full-time"]),
      salary_min || null,
      seniority || null,
      JSON.stringify(industries || []),
      visa_required ? 1 : 0,
      willing_to_relocate ? 1 : 0,
      session.userId
    );
  } else {
    db.prepare(`
      INSERT INTO job_search_preferences
        (id, user_id, locations_json, remote_preference, job_types_json, salary_min, seniority, industries_json, visa_required, willing_to_relocate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(),
      session.userId,
      JSON.stringify(locations || []),
      remote_preference || "hybrid",
      JSON.stringify(job_types || ["full-time"]),
      salary_min || null,
      seniority || null,
      JSON.stringify(industries || []),
      visa_required ? 1 : 0,
      willing_to_relocate ? 1 : 0
    );
  }

  db.prepare(
    "UPDATE user_profiles SET onboarding_step = 'jobs' WHERE user_id = ?"
  ).run(session.userId);

  return NextResponse.json({ ok: true });
}
