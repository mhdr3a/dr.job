import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";
import { parseCVText } from "@/lib/ai/cv-parser";
import { getCareerRecommendations } from "@/lib/ai/recommender";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const existing = db
    .prepare("SELECT id FROM resumes WHERE user_id = ?")
    .all(session.userId) as { id: string }[];
  if (existing.length >= 2) {
    return NextResponse.json({ error: "Maximum 2 CVs allowed" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["application/pdf", "text/plain"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF and TXT files are supported" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${session.userId}_${uuid()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  let rawText = "";
  if (file.type === "application/pdf") {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    rawText = text;
  } else {
    rawText = buffer.toString("utf-8");
  }

  const resumeId = uuid();
  db.prepare(
    "INSERT INTO resumes (id, user_id, file_name, raw_text) VALUES (?, ?, ?, ?)"
  ).run(resumeId, session.userId, file.name, rawText);

  // Run AI parsing async-style (we return right away, then update)
  try {
    const parsed = await parseCVText(rawText);
    db.prepare("UPDATE resumes SET parsed_json = ? WHERE id = ?").run(
      JSON.stringify(parsed),
      resumeId
    );

    // Update or create user profile
    const profileExists = db
      .prepare("SELECT id FROM user_profiles WHERE user_id = ?")
      .get(session.userId);

    if (profileExists) {
      db.prepare(
        "UPDATE user_profiles SET current_title = ?, years_experience = ?, summary = ?, parsed_data_json = ? WHERE user_id = ?"
      ).run(
        parsed.current_title,
        parsed.years_experience,
        parsed.summary,
        JSON.stringify(parsed),
        session.userId
      );
    } else {
      db.prepare(
        "INSERT INTO user_profiles (id, user_id, current_title, years_experience, summary, parsed_data_json, onboarding_step) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        uuid(),
        session.userId,
        parsed.current_title,
        parsed.years_experience,
        parsed.summary,
        JSON.stringify(parsed),
        "upload"
      );
    }

    // Generate career recommendations and seed swipe cards
    const recs = await getCareerRecommendations(parsed);

    // Clear old AI suggestions before inserting new ones
    db.prepare(
      "DELETE FROM user_skill_preferences WHERE user_id = ? AND source = 'ai_suggested'"
    ).run(session.userId);
    db.prepare(
      "DELETE FROM job_title_preferences WHERE user_id = ?"
    ).run(session.userId);

    for (const skill of recs.skills) {
      db.prepare(
        "INSERT INTO user_skill_preferences (id, user_id, skill_name, skill_type, status, source) VALUES (?, ?, ?, ?, 'unsure', 'ai_suggested')"
      ).run(uuid(), session.userId, skill.name, skill.type);
    }

    for (const jt of recs.job_titles) {
      db.prepare(
        "INSERT INTO job_title_preferences (id, user_id, title, description, status) VALUES (?, ?, ?, ?, 'unsure')"
      ).run(uuid(), session.userId, jt.title, jt.description);
    }

    // Store industry suggestions in profile
    db.prepare(
      "UPDATE user_profiles SET parsed_data_json = ? WHERE user_id = ?"
    ).run(
      JSON.stringify({ ...parsed, recommended_industries: recs.industries, search_keywords: recs.search_keywords }),
      session.userId
    );

    return NextResponse.json({
      ok: true,
      resume_id: resumeId,
      parsed,
      recommendations: recs,
    });
  } catch (err) {
    console.error("AI parsing error:", err);
    return NextResponse.json({
      ok: true,
      resume_id: resumeId,
      warning: "CV saved but AI parsing failed. Please try again.",
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const resumes = db
    .prepare("SELECT id, file_name, created_at FROM resumes WHERE user_id = ? ORDER BY created_at ASC")
    .all(session.userId);

  return NextResponse.json({ resumes });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resumeId = searchParams.get("id");
  if (!resumeId) {
    return NextResponse.json({ error: "Resume ID required" }, { status: 400 });
  }

  const resume = db
    .prepare("SELECT id FROM resumes WHERE id = ? AND user_id = ?")
    .get(resumeId, session.userId);
  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM resumes WHERE id = ?").run(resumeId);
  return NextResponse.json({ ok: true });
}
