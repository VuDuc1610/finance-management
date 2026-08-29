"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: number;
  role: "user" | "model";
  content: string;
}

export function AdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;

    fetch("/api/chat")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Request failed");
        }
        return res.json();
      })
      .then((data) => {
        setMessages(data.messages);
        messageIdRef.current = Math.max(0, ...data.messages.map((m: ChatMessage) => m.id));
      })
      .catch(() => {
        setError("Failed to load chat history.");
      })
      .finally(() => setHasLoadedHistory(true));
  }, [isOpen, hasLoadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { id: messageIdRef.current++, role: "user", content: text }]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Request failed");
      }

      setMessages((prev) => [
        ...prev,
        { id: messageIdRef.current++, role: "model", content: data.reply },
      ]);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong — try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close finance advisor chat" : "Open finance advisor chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-dye-saffron font-sans text-[1.25rem] text-ink-900 shadow-lg hover:opacity-90"
      >
        {isOpen ? "×" : "💬"}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-96 flex-col rounded-card border border-linen-300 bg-linen-100 shadow-xl">
          <div className="border-b border-linen-300 px-4 py-3 font-sans text-[0.9375rem] font-medium text-ink-900">
            Finance Advisor
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && hasLoadedHistory && (
              <p className="font-sans text-[0.8125rem] text-linen-700">
                Ask about your spending, subscriptions, cash flow, or net worth.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 font-sans text-[0.8125rem] whitespace-pre-wrap ${
                  message.role === "user"
                    ? "ml-auto bg-dye-indigo text-linen-100"
                    : "bg-linen-300/50 text-ink-900"
                }`}
              >
                {message.content}
              </div>
            ))}
            {error && <p className="font-sans text-[0.75rem] text-dye-madder">{error}</p>}
          </div>

          <div className="flex gap-2 border-t border-linen-300 p-3">
            <input
              type="text"
              aria-label="Message input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
              disabled={isSending}
              placeholder="Ask about your spending…"
              className="flex-1 rounded-pill border border-linen-300 bg-white px-3 py-2 font-sans text-[0.8125rem] text-ink-900 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || input.trim().length === 0}
              className="rounded-pill bg-dye-saffron px-4 py-2 font-sans text-[0.8125rem] font-medium text-ink-900 hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
