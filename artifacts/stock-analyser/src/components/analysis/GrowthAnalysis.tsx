import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GrowthAnalysis as IGrowthAnalysis } from "@workspace/api-client-react";
import { formatPercent, formatCurrency } from "@/lib/format";

export default function GrowthAnalysis({ growth }: { growth: IGrowthAnalysis }) {
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

      {/* Future Projections */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
        <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest mb-3">1Y Price Projection Range</h3>
        
        <div className="flex items-center justify-between">
          <div className="text-center">
            <span className="block text-xs font-mono text-muted-foreground mb-1">Low Case</span>
            <span className="text-lg font-mono font-bold text-destructive" data-testid="growth-low">{formatCurrency(growth.projectedLow)}</span>
          </div>
          
          <div className="flex-1 px-4 flex items-center justify-center">
            <div className="h-px bg-border w-full relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-muted-foreground rounded-full" />
            </div>
          </div>

          <div className="text-center">
            <span className="block text-xs font-mono text-muted-foreground mb-1">High Case</span>
            <span className="text-lg font-mono font-bold text-success" data-testid="growth-high">{formatCurrency(growth.projectedHigh)}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            <span className="font-semibold not-italic text-foreground">Basis:</span> {growth.projectionBasis}
          </p>
        </div>
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
