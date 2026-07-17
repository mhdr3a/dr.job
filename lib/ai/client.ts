import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
}

/** Strip markdown code fences that models sometimes add around JSON */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: options.max_tokens ?? 1024,
    system,
    messages: rest,
    temperature: options.temperature ?? 0.1,
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  return options.json ? extractJson(text) : text;
}

export async function chatJson<T = unknown>(
  messages: ChatMessage[],
  options: Omit<ChatOptions, "json"> = {}
): Promise<T> {
  const raw = await chat(messages, { ...options, json: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`AI returned invalid JSON:\n${raw.slice(0, 300)}`);
  }
}
