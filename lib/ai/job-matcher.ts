import { chatJson } from "./client";

export interface JobMatchResult {
  score: number;
  match_reasons: string[];
  concerns: string[];
  recommended_action: "Apply" | "Consider" | "Skip";
}

const SYSTEM_PROMPT = `You are a job match analyzer. Given a candidate profile and a job posting, evaluate fit.
Return a JSON object with this exact shape:
{
  "score": number (0-100),
  "match_reasons": string[] (2-4 reasons why this is a good match),
  "concerns": string[] (1-3 potential concerns, empty array if none),
  "recommended_action": "Apply" | "Consider" | "Skip"
}
Be concise. Return only the JSON. No markdown, no explanation.`;

export async function matchJob(
  profile: {
    current_title: string;
    years_experience: number;
    skills: { technical: string[]; tools: string[]; soft: string[] };
    industries: string[];
  },
  preferences: {
    seniority?: string;
    remote_preference?: string;
    locations?: string[];
  },
  job: {
    title: string;
    company: string;
    location: string;
    description: string;
  }
): Promise<JobMatchResult> {
  const input = JSON.stringify({ profile, preferences, job });

  return chatJson<JobMatchResult>(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input.slice(0, 6000) },
    ],
    { temperature: 0.1 }
  );
}
