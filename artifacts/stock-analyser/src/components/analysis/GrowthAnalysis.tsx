import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GrowthAnalysis as IGrowthAnalysis } from "@workspace/api-client-react";
import { formatPercent, formatCurrency } from "@/lib/format";

export default function GrowthAnalysis({ growth }: { growth: IGrowthAnalysis }) {
  const hasRealPrice = growth.realPriceLow != null || growth.realPriceHigh != null;
  const hasScore = growth.scoreLow != null || growth.scoreHigh != null;

  return (
    <Card className="p-5 border-border bg-card shadow-sm flex flex-col gap-5">
      <div className="border-b border-border pb-3">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">Growth Projections</h2>
      </div>

      {/* Historical CAGR */}
      <div>
        <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest mb-3">Historical CAGR (Price)</h3>
        <div className="flex items-center justify-between">
          <CagrBlock label="1Y" value={growth.cagr1y} />
          <CagrBlock label="3Y" value={growth.cagr3y} />
          <CagrBlock label="5Y" value={growth.cagr5y} />
        </div>
      </div>

      {/* Real-Price Projection */}
      {hasRealPrice && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest">Real-Price Projection (1Y)</h3>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <span className="block text-[10px] font-mono text-muted-foreground mb-1">Low Case</span>
              <span className="text-xl font-mono font-bold text-destructive" data-testid="growth-low">
                {growth.realPriceLow != null ? formatCurrency(growth.realPriceLow) : "N/A"}
              </span>
              {growth.projectedLow != null && (
                <span className="block text-[10px] font-mono text-muted-foreground/60 mt-0.5">{formatPercent(growth.projectedLow)} growth</span>
              )}
            </div>

            <div className="flex-1 px-4 flex items-center justify-center">
              <div className="h-px bg-border w-full relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-muted-foreground rounded-full" />
              </div>
            </div>

            <div className="text-center">
              <span className="block text-[10px] font-mono text-muted-foreground mb-1">High Case</span>
              <span className="text-xl font-mono font-bold text-success" data-testid="growth-high">
                {growth.realPriceHigh != null ? formatCurrency(growth.realPriceHigh) : "N/A"}
              </span>
              {growth.projectedHigh != null && (
                <span className="block text-[10px] font-mono text-muted-foreground/60 mt-0.5">{formatPercent(growth.projectedHigh)} growth</span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/60 italic">
            Formula: Current Price × (1 + growth rate). These are rough estimates, not guarantees.
          </p>
        </div>
      )}

      {/* Score Projection */}
      {hasScore && (
        <div className="rounded-lg p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest">Score Projection (0–100 scale)</h3>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-mono font-bold text-primary tabular-nums">
              {growth.scoreLow?.toFixed(1) ?? "—"}
            </span>
            <span className="text-muted-foreground/40 text-lg">–</span>
            <span className="text-2xl font-mono font-bold text-primary tabular-nums">
              {growth.scoreHigh?.toFixed(1) ?? "—"}
            </span>
          </div>

          {/* Visual bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="absolute top-0 bottom-0 bg-primary/40 rounded-full"
              style={{
                left: `${growth.scoreLow ?? 0}%`,
                width: `${(growth.scoreHigh ?? 0) - (growth.scoreLow ?? 0)}%`,
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-border/60" />
          </div>

          <p className="text-[10px] text-muted-foreground/60 italic">
            These are scores, not prices. They show growth strength on a shared scale (50 = neutral) so different assets can be compared side-by-side.
          </p>
        </div>
      )}

      {/* Legacy % range if no real price data */}
      {!hasRealPrice && (growth.projectedLow != null || growth.projectedHigh != null) && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest mb-3">1Y Projected Growth Range</h3>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <span className="block text-xs font-mono text-muted-foreground mb-1">Low Case</span>
              <span className="text-lg font-mono font-bold text-destructive">{formatPercent(growth.projectedLow)}</span>
            </div>
            <div className="flex-1 px-4 flex items-center justify-center">
              <div className="h-px bg-border w-full relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-muted-foreground rounded-full" />
              </div>
            </div>
            <div className="text-center">
              <span className="block text-xs font-mono text-muted-foreground mb-1">High Case</span>
              <span className="text-lg font-mono font-bold text-success">{formatPercent(growth.projectedHigh)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 pt-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">
          <span className="font-semibold not-italic text-foreground/60">Basis:</span> {growth.projectionBasis}
        </p>
      </div>

      {/* Bull & Bear Scenarios */}
      {(growth.bullScenario || growth.bearScenario) && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest">Scenarios</h3>
          {growth.bullScenario && (
            <div className="flex gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">Bull Case</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{growth.bullScenario}</p>
              </div>
            </div>
          )}
          {growth.bearScenario && (
            <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <TrendingDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider block mb-1">Bear Case</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{growth.bearScenario}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CagrBlock({ label, value }: { label: string, value: number | null | undefined }) {
  const isPositive = value && value > 0;
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-muted-foreground font-mono mb-1">{label}</span>
      <span className={`text-base font-mono font-bold ${value ? (isPositive ? 'text-success' : 'text-destructive') : 'text-muted-foreground'}`}>
        {formatPercent(value)}
      </span>
    </div>
  );
}
