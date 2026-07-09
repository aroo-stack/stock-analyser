import { Crosshair, TrendingUp, TrendingDown, Minus, Clock, Activity, BarChart2, Volume2, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TimingSignals {
  rsiSignal:          "oversold" | "neutral" | "overbought" | null;
  bollingerSignal:    "near_low" | "middle" | "near_high" | null;
  macdSignal:         "bullish_crossover" | "bullish" | "bearish" | "bearish_crossover" | null;
  momentumSignal:     "accelerating" | "stable" | "decelerating" | null;
  fiftyTwoWeekSignal: "near_low" | "middle" | "near_high" | null;
  obvSignal:          "confirming" | "diverging" | null;
  atrSignal:          "low_volatility" | "normal" | "high_volatility" | null;
  williamsRSignal:    "oversold" | "neutral" | "overbought" | null;
}

interface TimingScoreData {
  score: number;
  label: "Buy Now" | "Leaning Yes" | "Wait" | "Leaning No" | "Avoid";
  colour: "green" | "amber" | "red";
  summary: string;
  signals: TimingSignals;
  bestCaseEntry: string;
  riskToEntry: string;
}

interface Props {
  data: TimingScoreData;
}

const SCORE_COLOURS = {
  green: { ring: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  amber: { ring: "border-amber-500/40",   bg: "bg-amber-500/10",   text: "text-amber-400",   badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  red:   { ring: "border-red-500/40",     bg: "bg-red-500/10",     text: "text-red-400",     badge: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function SignalPill({ label, value, good, bad }: { label: string; value: string | null; good: string[]; bad: string[] }) {
  if (!value) return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-mono text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono text-muted-foreground/50">N/A</span>
    </div>
  );

  const isGood = good.includes(value);
  const isBad  = bad.includes(value);
  const dot = isGood ? "bg-emerald-400" : isBad ? "bg-red-400" : "bg-slate-400";
  const textColor = isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-slate-400";
  const label2 = value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-mono text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className={`text-[10px] font-mono font-bold ${textColor}`}>{label2}</span>
      </div>
    </div>
  );
}

export default function TimingScore({ data }: Props) {
  const c = SCORE_COLOURS[data.colour];
  const { signals } = data;

  const scoreArc = Math.min(100, Math.max(0, data.score));
  const dashArray = 2 * Math.PI * 36;
  const dashOffset = dashArray * (1 - scoreArc / 100);

  return (
    <Card className={`p-6 border-border bg-card shadow-sm border ${c.ring} timing-score-card`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${c.bg}`}>
            <Crosshair className={`w-4 h-4 ${c.text}`} />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold text-foreground">Should I Buy Now?</h2>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Technical timing signals only</p>
          </div>
        </div>
      </div>

      {/* Score + Label row */}
      <div className="flex items-center gap-6 mb-5">
        {/* Circular score */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
            <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke={data.colour === "green" ? "#10b981" : data.colour === "amber" ? "#f59e0b" : "#ef4444"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-mono font-bold ${c.text}`}>{data.score}</span>
            <span className="text-[9px] font-mono text-muted-foreground">/100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className={`inline-flex items-center px-3 py-1 rounded-full border font-mono text-xs font-bold uppercase tracking-wider mb-2 ${c.badge}`}>
            {data.label}
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {/* Signal grid — two columns */}
      <div className="grid grid-cols-2 gap-x-6 mb-5">
        <div>
          <SignalPill label="RSI" value={signals.rsiSignal}
            good={["oversold"]} bad={["overbought"]} />
          <SignalPill label="Bollinger" value={signals.bollingerSignal}
            good={["near_low"]} bad={["near_high"]} />
          <SignalPill label="MACD" value={signals.macdSignal}
            good={["bullish_crossover", "bullish"]} bad={["bearish_crossover", "bearish"]} />
          <SignalPill label="Williams %R" value={signals.williamsRSignal}
            good={["oversold"]} bad={["overbought"]} />
        </div>
        <div>
          <SignalPill label="Momentum" value={signals.momentumSignal}
            good={["accelerating"]} bad={["decelerating"]} />
          <SignalPill label="52-Week Pos." value={signals.fiftyTwoWeekSignal}
            good={["near_low"]} bad={["near_high"]} />
          <SignalPill label="Volume (OBV)" value={signals.obvSignal}
            good={["confirming"]} bad={["diverging"]} />
          <SignalPill label="Volatility" value={signals.atrSignal}
            good={["low_volatility"]} bad={["high_volatility"]} />
        </div>
      </div>

      {/* Entry context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Why now could work</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{data.bestCaseEntry}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">Risk to entry</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{data.riskToEntry}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] font-mono text-muted-foreground/60 text-center">
        Timing signals are based on technical indicators only · Not financial advice
      </p>
    </Card>
  );
}
