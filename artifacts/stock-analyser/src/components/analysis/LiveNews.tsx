import { ExternalLink, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  headline: string;
  publisher: string;
  url?: string | null;
  publishedAt: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  impact: string;
}

interface LiveNewsAnalysis {
  items: NewsItem[];
  overallSentiment: "Positive" | "Neutral" | "Negative";
  sentimentScore: number;
  summary: string;
  impactBullets: string[];
}

interface LiveNewsProps {
  liveNews: LiveNewsAnalysis;
}

const SENTIMENT_CONFIG = {
  Positive: {
    label: "Good",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: TrendingUp,
    iconClass: "text-emerald-400",
  },
  Neutral: {
    label: "Neutral",
    badgeClass: "bg-muted/60 text-muted-foreground border-border",
    icon: Minus,
    iconClass: "text-muted-foreground",
  },
  Negative: {
    label: "Bad",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: TrendingDown,
    iconClass: "text-red-400",
  },
};

function formatPublishedAt(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD === 1) return "Yesterday";
    if (diffD < 7) return `${diffD}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(-5, Math.min(5, score));
  const pct = ((clamped + 5) / 10) * 100;

  const color =
    clamped >= 2 ? "bg-emerald-500" :
    clamped <= -2 ? "bg-red-500" :
    "bg-amber-500";

  const label =
    clamped >= 3 ? "Very Positive" :
    clamped >= 1 ? "Positive" :
    clamped <= -3 ? "Very Negative" :
    clamped <= -1 ? "Negative" :
    "Neutral";

  const labelColor =
    clamped >= 1 ? "text-emerald-400" :
    clamped <= -1 ? "text-red-400" :
    "text-amber-400";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
        <div
          className={`absolute top-0 bottom-0 left-0 ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-border/60" />
      </div>
      <span className={`text-xs font-mono tabular-nums ${labelColor}`}>
        {clamped > 0 ? "+" : ""}{clamped.toFixed(0)} / {label}
      </span>
    </div>
  );
}

export default function LiveNews({ liveNews }: LiveNewsProps) {
  const { items, overallSentiment, sentimentScore, summary, impactBullets } = liveNews;
  const overallConfig = SENTIMENT_CONFIG[overallSentiment];

  const positiveCount = items.filter((i) => i.sentiment === "Positive").length;
  const neutralCount = items.filter((i) => i.sentiment === "Neutral").length;
  const negativeCount = items.filter((i) => i.sentiment === "Negative").length;
  const total = items.length || 1;

  return (
    <Card className="p-5 border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Live News &amp; Sentiment
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{summary}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs font-mono ml-4 shrink-0 ${overallConfig.badgeClass}`}
        >
          {overallConfig.label}
        </Badge>
      </div>

      {/* Sentiment score gauge */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Sentiment Score (–5 to +5)</span>
        </div>
        <ScoreGauge score={sentimentScore} />
      </div>

      {/* Breakdown bar */}
      {items.length > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden mb-3 gap-0.5">
          {positiveCount > 0 && (
            <div className="bg-emerald-500 rounded-full" style={{ width: `${(positiveCount / total) * 100}%` }} />
          )}
          {neutralCount > 0 && (
            <div className="bg-muted-foreground/40 rounded-full" style={{ width: `${(neutralCount / total) * 100}%` }} />
          )}
          {negativeCount > 0 && (
            <div className="bg-red-500 rounded-full" style={{ width: `${(negativeCount / total) * 100}%` }} />
          )}
        </div>
      )}

      {/* Counts */}
      {items.length > 0 && (
        <div className="flex gap-4 mb-5 text-xs font-mono">
          <span className="text-emerald-400">{positiveCount} positive</span>
          <span className="text-muted-foreground">{neutralCount} neutral</span>
          <span className="text-red-400">{negativeCount} negative</span>
        </div>
      )}

      {/* Impact bullets */}
      {impactBullets && impactBullets.length > 0 && (
        <div className="mb-5 p-3 rounded-lg bg-muted/20 border border-border/50 space-y-2">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">News Impact on Fundamentals</span>
          {impactBullets.map((bullet, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border/50 mb-4" />

      {/* News items */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No recent news headlines found.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => {
            const config = SENTIMENT_CONFIG[item.sentiment];
            const Icon = config.icon;
            return (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${config.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:text-primary transition-colors leading-snug inline-flex items-start gap-1 group/link"
                        >
                          <span className="line-clamp-2">{item.headline}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <p className="text-sm text-foreground leading-snug line-clamp-2">{item.headline}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono shrink-0 px-1.5 py-0 ${config.badgeClass}`}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground/70">{item.publisher}</span>
                    <span className="text-[10px] text-muted-foreground/40">·</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">{formatPublishedAt(item.publishedAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.impact}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
