"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

type Msg = { role: "bot" | "user"; text: string; sources?: { slug: string; title: string }[] };

// Brand-token styling helpers (this widget lives outside .neo now).
const RULE = "1px solid rgba(27,28,36,.1)";

export default function ChatBot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([
        { role: "bot", text: "Hi — I'm trained on the Tendso knowledge base. Ask me anything." },
        { role: "bot", text: "Try: \"How much do I earn?\" or \"How fast can I get a site?\"" },
    ]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const askAI = useAction(api.knowledgeAI.ask);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, open]);

    // Grounded answer from the Tendso knowledge base (Convex + Gemini RAG),
    // scoped to the public Help Center workspace.
    const ask = async () => {
        const q = input.trim();
        if (!q || busy) return;
        const history = messages
            .filter((m, i) => !(m.role === "bot" && i < 2))
            .map((m) => ({ role: m.role === "bot" ? ("assistant" as const) : ("user" as const), text: m.text }))
            .slice(-6);
        setInput("");
        setMessages((m) => [...m, { role: "user", text: q }]);
        setBusy(true);
        try {
            const res = await askAI({ query: q, workspace: "help", source: "chatbot", history });
            setMessages((m) => [...m, { role: "bot", text: res.answer, sources: res.sources }]);
        } catch {
            setMessages((m) => [
                ...m,
                {
                    role: "bot",
                    text: "I couldn't reach the knowledge base just now — try again in a moment, or grab the app to ask in-app.",
                },
            ]);
        } finally {
            setBusy(false);
        }
    };

    const suggestions = [
        "How much does a site cost?",
        "How fast can I get one?",
        "Where do payouts go?",
        "Do I need experience?",
    ];

    return (
        <>
            {open && (
                <div className="tnd-chatbot-window" role="dialog" aria-label="Chat with us">
                    <div
                        className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: RULE, background: "var(--khaki)" }}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="tnd-live-dot" />
                                <span
                                    className="italic"
                                    style={{ fontFamily: "var(--font-fraunces)", fontWeight: 560, fontSize: 20, letterSpacing: "-.01em", color: "var(--ink)" }}
                                >
                                    Ask Tendso
                                </span>
                            </div>
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                                Powered by our knowledge base
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full text-sm text-ink"
                            style={{ border: RULE, background: "#fff" }}
                        >
                            ×
                        </button>
                    </div>

                    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className="max-w-[85%] px-3.5 py-2.5 text-sm leading-snug [overflow-wrap:anywhere]"
                                style={{
                                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                    background: m.role === "user" ? "var(--ink)" : "var(--khaki-deep)",
                                    color: m.role === "user" ? "var(--khaki)" : "var(--ink)",
                                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                }}
                            >
                                {m.text}
                                {m.role === "bot" && m.sources && m.sources.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-1">
                                        {m.sources.map((s) => (
                                            <a
                                                key={s.slug}
                                                href={`/knowledge?ws=help&article=${encodeURIComponent(s.slug)}`}
                                                className="text-xs underline"
                                                style={{ color: "var(--rust)" }}
                                            >
                                                → {s.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {busy && (
                            <div className="self-start px-3 py-2 text-[13px] text-ink-soft">
                                <span className="tnd-live-dot" style={{ marginRight: 6 }} />typing…
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 px-4 py-2.5" style={{ borderTop: RULE }}>
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setInput(s)}
                                className="cursor-pointer rounded-full border border-ink/15 bg-white px-3 py-1 text-xs text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 p-3" style={{ borderTop: RULE, background: "var(--khaki)" }}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") ask();
                            }}
                            placeholder="Type a question…"
                            className="flex-1 rounded-full px-3.5 py-2.5 text-sm text-ink outline-none"
                            style={{ border: RULE, background: "#fff", fontFamily: "var(--font-plus-jakarta)" }}
                        />
                        <button
                            type="button"
                            onClick={ask}
                            disabled={!input.trim() || busy}
                            aria-label="Send"
                            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-base"
                            style={{ background: "var(--ink)", color: "var(--khaki)", opacity: !input.trim() || busy ? 0.4 : 1 }}
                        >
                            ↑
                        </button>
                    </div>
                </div>
            )}

            <button
                type="button"
                className="tnd-chatbot-fab"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close chat" : "Open chat"}
            >
                {open ? (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M5 5 L17 17 M17 5 L5 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M4 6 C4 4.9 4.9 4 6 4 H18 C19.1 4 20 4.9 20 6 V14 C20 15.1 19.1 16 18 16 H10 L6 20 V16 H6 C4.9 16 4 15.1 4 14 V6 Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                        />
                        <circle cx="9" cy="10" r="1" fill="currentColor" />
                        <circle cx="12" cy="10" r="1" fill="currentColor" />
                        <circle cx="15" cy="10" r="1" fill="currentColor" />
                    </svg>
                )}
            </button>
        </>
    );
}
