export interface AdzunaJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string;
}

export async function searchJobs(params: {
  keywords: string;
  location?: string;
  salary_min?: number;
  full_time?: boolean;
  country?: string;
  max_results?: number;
}): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Adzuna credentials not set, returning empty results");
    return [];
  }

  const country = params.country || "ca";
  const maxResults = params.max_results || 20;

  const query = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(maxResults),
    what: params.keywords,
    content_type: "application/json",
  });

  if (params.location) query.set("where", params.location);
  if (params.salary_min) query.set("salary_min", String(params.salary_min));
  if (params.full_time) query.set("full_time", "1");

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${query}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("Adzuna API error", res.status, await res.text());
    return [];
  }

  const data = await res.json();

  return (data.results || []).map(
    (job: {
      id: string;
      title: string;
      company: { display_name: string };
      location: { display_name: string };
      description: string;
      redirect_url: string;
      salary_min?: number;
      salary_max?: number;
      created: string;
    }) => ({
      id: job.id,
      title: job.title,
      company: job.company?.display_name || "",
      location: job.location?.display_name || "",
      description: job.description || "",
      url: job.redirect_url,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      posted_at: job.created,
    })
  );
}
