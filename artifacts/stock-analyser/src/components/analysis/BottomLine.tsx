import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import type { BottomLineResult } from "@workspace/api-client-react";

interface Props {
  data: BottomLineResult;
  currentPrice: number;
}

function pct(v: number | null | undefined, decimals = 1): string {
  if (v == null) return "—";
  const s = v.toFixed(decimals);
  return v >= 0 ? `+${s}%` : `${s}%`;
}

function fmt(v: number | null | undefined, prefix = "$"): string {
  if (v == null) return "—";
  return `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtN(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function changePct(target: number | null | undefined, current: number): string {
  if (target == null) return "";
  const p = ((target - current) / current) * 100;
  return pct(p);
}

function barColor(score: number): string {
  if (score > 65) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function barTextColor(score: number): string {
  if (score > 65) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function verdictBg(colour: BottomLineResult["verdictColour"]): string {
  if (colour === "green") return "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300";
  if (colour === "amber") return "bg-amber-500/20 border border-amber-500/40 text-amber-300";
  return "bg-red-500/20 border border-red-500/40 text-red-300";
}

function targetChangeColor(target: number | null | undefined, current: number): string {
  if (target == null) return "text-muted-foreground";
  return target > current ? "text-emerald-400" : "text-red-400";
}

interface SignalPillProps {
  label: string;
  value: string | null | undefined;
  badge?: string;
  badgeColor?: string;
}

function SignalPill({ label, value, badge, badgeColor }: SignalPillProps) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted/30 border border-border/50">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider leading-none">{label}</span>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-sm font-mono font-medium text-foreground">{value ?? "—"}</span>
        {badge && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${badgeColor ?? "bg-muted text-muted-foreground"}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 mt-6 first:mt-0 border-b border-border/40 pb-2">
      {children}
    </h4>
  );
}

export default function BottomLine({ data, currentPrice }: Props) {
  const [open, setOpen] = useState(false);
  const s = data.signals;

  // RSI badge
  const rsiBadge = s.rsi14 != null
    ? s.rsi14 > 70 ? { text: "Overbought", color: "bg-red-500/20 text-red-400" }
    : s.rsi14 < 30 ? { text: "Oversold", color: "bg-emerald-500/20 text-emerald-400" }
    : null : null;

  // Williams %R badge
  const wrBadge = s.williamsR != null
    ? s.williamsR > -20 ? { text: "OB", color: "bg-red-500/20 text-red-400" }
    : s.williamsR < -80 ? { text: "OS", color: "bg-emerald-500/20 text-emerald-400" }
    : null : null;

  // Stochastic badge
  const stochBadge = s.stochasticK != null
    ? s.stochasticK > 80 ? { text: "Overbought", color: "bg-red-500/20 text-red-400" }
    : s.stochasticK < 20 ? { text: "Oversold", color: "bg-emerald-500/20 text-emerald-400" }
    : null : null;

  // MACD badge
  const macdBadge = data.signals.macd === "bullish"
    ? { text: "↑ Bullish", color: "bg-emerald-500/20 text-emerald-400" }
    : data.signals.macd === "bearish"
    ? { text: "↓ Bearish", color: "bg-red-500/20 text-red-400" }
    : { text: "→ Neutral", color: "bg-muted text-muted-foreground" };

  // OBV trend
  const obvBadge = s.obvTrend === "rising"
    ? { text: "Rising", color: "bg-emerald-500/20 text-emerald-400" }
    : s.obvTrend === "falling"
    ? { text: "Falling", color: "bg-red-500/20 text-red-400" }
    : s.obvTrend === "flat"
    ? { text: "Flat", color: "bg-muted text-muted-foreground" }
    : null;

  // Golden cross
  const gcBadge = s.goldenCross === true
    ? { text: "Golden Cross", color: "bg-emerald-500/20 text-emerald-400" }
    : s.goldenCross === false
    ? { text: "Death Cross", color: "bg-red-500/20 text-red-400" }
    : null;

  // Ichimoku
  const ichBadge = s.ichimokuSignal === "above_cloud"
    ? { text: "Above Cloud", color: "bg-emerald-500/20 text-emerald-400" }
    : s.ichimokuSignal === "below_cloud"
    ? { text: "Below Cloud", color: "bg-red-500/20 text-red-400" }
    : s.ichimokuSignal === "in_cloud"
    ? { text: "In Cloud", color: "bg-amber-500/20 text-amber-400" }
    : null;

  // Skewness badge
  const skewBadge = s.returnSkewness != null
    ? s.returnSkewness < -1
      ? { text: "Negative Skew ⚠", color: "bg-red-500/20 text-red-400" }
      : s.returnSkewness > 0.5
      ? { text: "Positive Skew", color: "bg-emerald-500/20 text-emerald-400" }
      : null
    : null;

  // Kurtosis badge
  const kurtBadge = s.returnKurtosis != null && s.returnKurtosis > 3
    ? { text: "Fat Tails ⚠", color: "bg-amber-500/20 text-amber-400" }
    : null;

  // Graham badge
  const grahamBadge = s.grahamVsCurrent != null
    ? s.grahamVsCurrent > 0
      ? { text: "Below Graham #", color: "bg-emerald-500/20 text-emerald-400" }
      : s.grahamVsCurrent > -10
      ? { text: "Near Graham #", color: "bg-amber-500/20 text-amber-400" }
      : { text: "Above Graham #", color: "bg-red-500/20 text-red-400" }
    : null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ── LAYMAN CARD ─────────────────────────────────────────── */}
      <div className="p-5 md:p-6">
        {/* Row 1: Verdict + Health + Score */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`px-4 py-1.5 rounded-lg text-sm font-mono font-bold tracking-wider uppercase ${verdictBg(data.verdictColour)}`}>
            {data.verdict}
          </span>
          <span className="text-xs font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
            Health: <span className="text-foreground font-semibold">{data.healthStatus}</span>
          </span>
          <div className="ml-auto flex items-baseline gap-1">
            <span className="text-3xl font-mono font-bold text-foreground">{data.compositeScore}</span>
            <span className="text-sm font-mono text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Row 2: One-liner */}
        <p className="text-sm text-foreground/80 leading-relaxed mb-5">
          {data.oneLiner}
        </p>

        {/* Row 3: Price Targets */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "1 Month", target: data.priceTargets.oneMonth, low: data.priceTargets.oneMonthLow, high: data.priceTargets.oneMonthHigh },
            { label: "6 Months", target: data.priceTargets.sixMonths, low: null, high: null },
            { label: "1 Year", target: data.priceTargets.oneYear, low: data.priceTargets.oneYearLow, high: data.priceTargets.oneYearHigh },
          ].map(({ label, target, low, high }) => (
            <div key={label} className="rounded-lg bg-muted/20 border border-border/50 p-3 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
              {target != null ? (
                <>
                  <span className="text-lg font-mono font-bold text-foreground">{fmt(target)}</span>
                  <span className={`text-xs font-mono font-medium ${targetChangeColor(target, currentPrice)}`}>
                    {changePct(target, currentPrice)}
                  </span>
                  {(low != null || high != null) && (
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      Bear {fmt(low)} · Bull {fmt(high)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Insufficient data</span>
              )}
            </div>
          ))}
        </div>

        {/* Row 4: Target Rationale */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-5 bg-muted/10 rounded-lg p-3 border border-border/30">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
          <span>{data.targetRationale}</span>
        </div>

        {/* Row 5: Score Bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([ 
            { label: "Momentum",  score: data.scores.momentum },
            { label: "Valuation", score: data.scores.valuation },
            { label: "Risk",      score: data.scores.risk },
            { label: "Quality",   score: data.scores.quality },
          ] as const).map(({ label, score }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className={`text-xs font-mono font-bold ${barTextColor(score)}`}>{score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-5 w-full flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border/40"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? "Hide" : "Show"} Full Quant Analysis
        </button>
      </div>

      {/* ── QUANT DETAIL PANEL ──────────────────────────────────── */}
      {open && (
        <div className="border-t border-border bg-muted/5 p-5 md:p-6">

          {/* Momentum & Technical */}
          <SectionHeader>Momentum &amp; Technical</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <SignalPill label="RSI 14" value={fmtN(s.rsi14)} badge={rsiBadge?.text} badgeColor={rsiBadge?.color} />
            <SignalPill label="Stoch %K / %D" value={s.stochasticK != null ? `${fmtN(s.stochasticK)} / ${fmtN(s.stochasticD)}` : null} badge={stochBadge?.text} badgeColor={stochBadge?.color} />
            <SignalPill label="Williams %R" value={fmtN(s.williamsR)} badge={wrBadge?.text} badgeColor={wrBadge?.color} />
            <SignalPill label="MACD" value={s.macdHistogram != null ? `Hist ${fmtN(s.macdHistogram)}` : null} badge={macdBadge.text} badgeColor={macdBadge.color} />
            <SignalPill label="Bollinger Position" value={s.bollingerPosition != null ? `${fmtN(s.bollingerPosition)}%` : null} />
            <SignalPill label="ATR 14" value={fmtN(s.atr14)} />
            <SignalPill label="OBV" value={s.obv != null ? s.obv.toLocaleString() : null} badge={obvBadge?.text} badgeColor={obvBadge?.color} />
            <SignalPill label="ROC 20d" value={s.roc20 != null ? `${pct(s.roc20)}` : null} />
            <SignalPill label="vs MA20" value={s.vsMA20 != null ? pct(s.vsMA20) : null} badgeColor={s.vsMA20 != null ? (s.vsMA20 > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400") : undefined} />
            <SignalPill label="vs MA50" value={s.vsMA50 != null ? pct(s.vsMA50) : null} badgeColor={s.vsMA50 != null ? (s.vsMA50 > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400") : undefined} />
            <SignalPill label="vs MA200" value={s.vsMA200 != null ? pct(s.vsMA200) : null} badgeColor={s.vsMA200 != null ? (s.vsMA200 > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400") : undefined} />
            <SignalPill label="Golden / Death Cross" value={s.goldenCross != null ? (s.goldenCross ? "✓ Golden" : "✗ Death") : null} badge={gcBadge?.text} badgeColor={gcBadge?.color} />
            <SignalPill label="Ichimoku" value={s.ichimokuSignal?.replace("_", " ") ?? null} badge={ichBadge?.text} badgeColor={ichBadge?.color} />
            <SignalPill label="Fibonacci Level" value={s.fibLevel} />
          </div>

          {/* Valuation */}
          <SectionHeader>Valuation</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <SignalPill label="P/E" value={fmtN(s.peRatio)} />
            <SignalPill label="Forward P/E" value={fmtN(s.forwardPE)} />
            <SignalPill label="PEG" value={fmtN(s.pegRatio)} />
            <SignalPill label="P/B" value={fmtN(s.pbRatio)} />
            <SignalPill label="P/S" value={fmtN(s.psRatio)} />
            <SignalPill label="EV / EBITDA" value={fmtN(s.evToEbitda)} />
            <SignalPill label="Earnings Yield" value={s.earningsYield != null ? `${fmtN(s.earningsYield)}%` : null} />
            <SignalPill label="Dividend Yield" value={s.dividendYield != null ? `${fmtN(s.dividendYield)}%` : null} />
            <SignalPill
              label="Graham Number"
              value={s.grahamNumber != null ? fmt(s.grahamNumber) : null}
              badge={s.grahamVsCurrent != null ? `${s.grahamVsCurrent > 0 ? "+" : ""}${s.grahamVsCurrent.toFixed(1)}% vs price` : undefined}
              badgeColor={grahamBadge?.color}
            />
            <SignalPill
              label="52-Wk Position"
              value={s.fiftyTwoWeekPosition != null ? `${fmtN(s.fiftyTwoWeekPosition, 1)}%` : null}
              badge={s.fiftyTwoWeekPosition != null ? (s.fiftyTwoWeekPosition > 80 ? "Near High" : s.fiftyTwoWeekPosition < 20 ? "Near Low" : undefined) : undefined}
              badgeColor={s.fiftyTwoWeekPosition != null ? (s.fiftyTwoWeekPosition > 80 ? "bg-amber-500/20 text-amber-400" : s.fiftyTwoWeekPosition < 20 ? "bg-emerald-500/20 text-emerald-400" : undefined) : undefined}
            />
          </div>

          {/* Risk & Statistics */}
          <SectionHeader>Risk &amp; Statistics</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <SignalPill label="Beta" value={fmtN(s.beta)} />
            <SignalPill label="30d Hist. Volatility" value={s.historicalVolatility30d != null ? `${fmtN(s.historicalVolatility30d)}%` : null} />
            <SignalPill label="Sharpe Ratio" value={fmtN(s.sharpeRatio)} />
            <SignalPill label="Sortino Ratio" value={fmtN(s.sortinoRatio)} />
            <SignalPill label="Max Drawdown" value={s.maxDrawdown != null ? `-${fmtN(s.maxDrawdown)}%` : null} />
            <SignalPill label="VaR 95% (daily)" value={s.valueAtRisk95 != null ? `${fmtN(s.valueAtRisk95)}%` : null} />
            <SignalPill label="Calmar Ratio" value={fmtN(s.calmarRatio)} />
            <SignalPill
              label="Skewness"
              value={fmtN(s.returnSkewness)}
              badge={skewBadge?.text}
              badgeColor={skewBadge?.color}
            />
            <SignalPill
              label="Excess Kurtosis"
              value={fmtN(s.returnKurtosis)}
              badge={kurtBadge?.text}
              badgeColor={kurtBadge?.color}
            />
          </div>

          {/* Quality / Fundamentals */}
          <SectionHeader>Quality / Fundamentals</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <SignalPill
              label="Revenue Growth"
              value={s.revenueGrowth != null ? `${pct(s.revenueGrowth * 100)}` : null}
            />
            <SignalPill
              label="Profit Margin"
              value={s.profitMargin != null ? `${fmtN(s.profitMargin * 100)}%` : null}
            />
            <SignalPill
              label="Return on Equity"
              value={s.returnOnEquity != null ? `${fmtN(s.returnOnEquity * 100)}%` : null}
            />
            <SignalPill label="Debt / Equity" value={fmtN(s.debtToEquity)} />
            <SignalPill label="Current Ratio" value={fmtN(s.currentRatio)} />
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border/40 space-y-2">
            {data.methodsUsed.length > 0 && (
              <p className="text-[11px] font-mono text-muted-foreground">
                <span className="text-foreground/60">Methods used: </span>
                {data.methodsUsed.join(" · ")}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{data.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
