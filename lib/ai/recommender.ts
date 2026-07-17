import { chatJson } from "./client";
import type { ParsedProfile } from "./cv-parser";

export interface CareerRecommendations {
  job_titles: { title: string; description: string }[];
  skills: { name: string; type: "technical" | "tool" | "soft" }[];
  industries: string[];
  search_keywords: string[];
}

const SYSTEM_PROMPT = `You are a career advisor. Given a structured candidate profile, suggest:
- 8-10 relevant job titles (with a one-sentence description each)
- 10-15 key skills (mix of technical, tools, and soft skills the candidate should highlight)
- 5-8 relevant industries
- 5-8 search keywords for job boards

Return a JSON object with this exact shape:
{
  "job_titles": [{ "title": string, "description": string }],
  "skills": [{ "name": string, "type": "technical" | "tool" | "soft" }],
  "industries": string[],
  "search_keywords": string[]
}
Return only the JSON. No markdown, no explanation.`;

export async function getCareerRecommendations(
  profile: ParsedProfile
): Promise<CareerRecommendations> {
  const profileSummary = JSON.stringify({
    current_title: profile.current_title,
    years_experience: profile.years_experience,
    industries: profile.industries,
    skills: profile.skills,
    experience: profile.experience.map((e) => ({
      title: e.title,
      company: e.company,
      duration: e.duration,
    })),
  });

  return chatJson<CareerRecommendations>(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: profileSummary },
    ],
    { temperature: 0.3 }
  );
}
