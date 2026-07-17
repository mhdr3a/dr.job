"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatBotProps {
  jobMatchId?: string;
  jobTitle?: string;
}

export default function ChatBot({ jobMatchId, jobTitle }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const question = input.trim();
    if (!question) return;

    setInput("");
    const updated: Message[] = [...messages, { role: "user", content: question }];
    setMessages(updated);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        job_match_id: jobMatchId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await res.json();
    setLoading(false);
    setMessages([...updated, { role: "assistant", content: data.answer }]);
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-medium">AI Assistant</p>
        {jobTitle && <p className="text-xs text-gray-400">Helping with: {jobTitle}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {messages.length === 0 && (
          <p className="text-gray-400 text-xs">
            Paste an application question here and I&apos;ll help you craft a strong answer based on your CV.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 max-w-[90%] whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-blue-50 text-blue-900 self-end ml-auto"
                : "bg-gray-50 text-gray-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-xs">
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-100 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Paste an application question…"
          rows={2}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="self-end bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
