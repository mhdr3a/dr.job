import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";
import { searchJobs } from "@/lib/jobs/adzuna";
import { matchJob } from "@/lib/ai/job-matcher";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const profile = db
    .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
    .get(session.userId) as
    | { parsed_data_json: string; current_title: string; years_experience: number }
    | undefined;

  if (!profile?.parsed_data_json) {
    return NextResponse.json({ error: "Profile not complete" }, { status: 400 });
  }

  const parsedProfile = JSON.parse(profile.parsed_data_json);

  const prefs = db
    .prepare("SELECT * FROM job_search_preferences WHERE user_id = ?")
    .get(session.userId) as
    | {
        locations_json: string;
        remote_preference: string;
        salary_min: number;
        seniority: string;
        industries_json: string;
        job_types_json: string;
      }
    | undefined;

  const likedTitles = db
    .prepare("SELECT title FROM job_title_preferences WHERE user_id = ? AND status = 'liked'")
    .all(session.userId) as { title: string }[];

  const seenJobIds = db
    .prepare("SELECT job_id FROM job_matches WHERE user_id = ?")
    .all(session.userId) as { job_id: string }[];
  const seenSet = new Set(seenJobIds.map((r) => r.job_id));

  const keywords =
    likedTitles.length > 0
      ? likedTitles.map((t) => t.title).join(" OR ")
      : profile.current_title || parsedProfile.search_keywords?.[0] || "software engineer";

  const locations = prefs?.locations_json ? JSON.parse(prefs.locations_json) : [];
  const location = locations[0] || "";

  const jobs = await searchJobs({
    keywords,
    location,
    salary_min: prefs?.salary_min,
    full_time: prefs?.job_types_json?.includes("full-time"),
    max_results: 20,
  });

  const profileForMatching = {
    current_title: profile.current_title,
    years_experience: profile.years_experience,
    skills: parsedProfile.skills || { technical: [], tools: [], soft: [] },
    industries: parsedProfile.industries || [],
  };

  const prefsForMatching = {
    seniority: prefs?.seniority,
    remote_preference: prefs?.remote_preference,
    locations,
  };

  const results = [];

  for (const job of jobs) {
    // Check if we've stored this job already
    const existingJob = db
      .prepare("SELECT id FROM jobs WHERE source = 'adzuna' AND external_id = ?")
      .get(job.id) as { id: string } | undefined;

    let jobDbId: string;
    if (existingJob) {
      jobDbId = existingJob.id;
    } else {
      jobDbId = uuid();
      db.prepare(`
        INSERT INTO jobs (id, source, external_id, title, company, location, description, url, salary_min, salary_max, posted_at, raw_json)
        VALUES (?, 'adzuna', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        jobDbId,
        job.id,
        job.title,
        job.company,
        job.location,
        job.description,
        job.url,
        job.salary_min,
        job.salary_max,
        job.posted_at,
        JSON.stringify(job)
      );
    }

    if (seenSet.has(jobDbId)) continue;

    const matchResult = await matchJob(profileForMatching, prefsForMatching, {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description.slice(0, 1000),
    });

    const matchId = uuid();
    db.prepare(`
      INSERT INTO job_matches (id, user_id, job_id, score, match_reasons_json, concerns_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `).run(
      matchId,
      session.userId,
      jobDbId,
      matchResult.score,
      JSON.stringify(matchResult.match_reasons),
      JSON.stringify(matchResult.concerns)
    );

    results.push({
      match_id: matchId,
      job_id: jobDbId,
      ...job,
      score: matchResult.score,
      match_reasons: matchResult.match_reasons,
      concerns: matchResult.concerns,
      recommended_action: matchResult.recommended_action,
    });
  }

  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({ jobs: results });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "new";

  const matches = db
    .prepare(`
      SELECT jm.*, j.title, j.company, j.location, j.url, j.description, j.salary_min, j.salary_max
      FROM job_matches jm
      JOIN jobs j ON j.id = jm.job_id
      WHERE jm.user_id = ? AND jm.status = ?
      ORDER BY jm.score DESC, jm.created_at DESC
    `)
    .all(session.userId, status) as {
      id: string;
      job_id: string;
      score: number;
      match_reasons_json: string;
      concerns_json: string;
      status: string;
      title: string;
      company: string;
      location: string;
      url: string;
      description: string;
      salary_min: number;
      salary_max: number;
    }[];

  return NextResponse.json({
    jobs: matches.map((m) => ({
      ...m,
      match_reasons: JSON.parse(m.match_reasons_json || "[]"),
      concerns: JSON.parse(m.concerns_json || "[]"),
    })),
  });
}
