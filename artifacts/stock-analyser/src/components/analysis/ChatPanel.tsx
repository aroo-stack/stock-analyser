import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, MessageSquare, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  ticker: string;
  analysisContext: string;
}

const STARTER_QUESTIONS = [
  "Is this stock expensive right now?",
  "What are the main risks?",
  "Who is this stock best suited for?",
  "What could drive the price higher?",
];

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPost(path: string, body: object): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function ChatPanel({ ticker, analysisContext }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [teachMeMode, setTeachMeMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      let convId = conversationId;

      if (!convId) {
        const startRes = await apiPost("/api/chat/start", { ticker });
        if (!startRes.ok) throw new Error("Failed to start conversation");
        const startData = await startRes.json();
        convId = startData.conversationId;
        setConversationId(convId);
      }

      const msgRes = await apiPost("/api/chat/message", {
        conversationId: convId,
        message: trimmed,
        ticker,
        analysisContext,
        teachMeMode,
      });

      if (!msgRes.ok) {
        const errData = await msgRes.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to get response");
      }

      const { reply } = await msgRes.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Ask about {ticker}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Chat with AI about this stock — not financial advice</p>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">Teach Me</span>
              <Switch
                checked={teachMeMode}
                onCheckedChange={setTeachMeMode}
                className="scale-90"
              />
            </div>
          </div>
        </div>
      </div>

      {teachMeMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-500/10 border border-blue-500/20">
          <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <p className="text-xs text-blue-300 font-mono">Teach Me mode on — explanations will be beginner-friendly with analogies</p>
        </div>
      )}

      <Card className="border-border bg-card flex flex-col" style={{ minHeight: 340 }}>
        {/* Message area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 400 }}>
          {messages.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-5 py-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-mono mb-1">Ask anything about {ticker}</p>
                <p className="text-xs text-muted-foreground/60 font-mono">Not financial advice</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs font-mono px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 text-muted-foreground transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-primary/20" : "bg-muted"}`}>
                    {msg.role === "user"
                      ? <User className="w-3.5 h-3.5 text-primary" />
                      : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </div>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/15 text-foreground rounded-tr-none"
                      : "bg-muted/60 text-foreground rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5 flex-row">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="px-3 py-2.5 rounded-lg rounded-tl-none bg-muted/60">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              {error && (
                <p className="text-xs text-red-400 font-mono text-center py-1">{error}</p>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${ticker}…`}
            className="flex-1 h-9 text-sm font-mono bg-muted/30 border-border focus-visible:border-primary"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="h-9 w-9 rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/30 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Send className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </Card>
    </div>
  );
}
