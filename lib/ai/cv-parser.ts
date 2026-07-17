import { chatJson } from "./client";

export interface ParsedProfile {
  name: string;
  current_title: string;
  years_experience: number;
  summary: string;
  industries: string[];
  skills: {
    technical: string[];
    tools: string[];
    soft: string[];
  };
  experience: {
    company: string;
    title: string;
    duration: string;
    achievements: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    year: string;
  }[];
  certifications: string[];
  languages: string[];
}

const SYSTEM_PROMPT = `You are a CV parser. Extract structured information from the provided CV text.
Return a JSON object with this exact shape:
{
  "name": string,
  "current_title": string,
  "years_experience": number,
  "summary": string (2-3 sentences),
  "industries": string[],
  "skills": {
    "technical": string[],
    "tools": string[],
    "soft": string[]
  },
  "experience": [{ "company": string, "title": string, "duration": string, "achievements": string[] }],
  "education": [{ "institution": string, "degree": string, "year": string }],
  "certifications": string[],
  "languages": string[]
}
Return only the JSON. No markdown, no explanation.`;

export async function parseCVText(rawText: string): Promise<ParsedProfile> {
  return chatJson<ParsedProfile>(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.slice(0, 8000) },
    ],
    { temperature: 0.1 }
  );
}
