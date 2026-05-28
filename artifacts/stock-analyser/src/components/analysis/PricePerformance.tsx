import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PricePerformance as IPricePerformance } from "@workspace/api-client-react";
import { formatCurrency, formatPercent } from "@/lib/format";

export default function PricePerformance({ performance }: { performance: IPricePerformance }) {
  const isPositive1d = performance.change1d && performance.change1d >= 0;
  
  return (
    <Card className="p-6 border-border bg-card shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Main Price Display */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Current Price</span>
          <div className="flex items-end space-x-3">
            <span className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tight" data-testid="perf-current-price">
              {formatCurrency(performance.currentPrice)}
            </span>
            {performance.change1d != null && performance.change1dPct != null && (
              <div className={`flex items-center mb-1 font-mono text-lg ${isPositive1d ? 'text-success' : 'text-destructive'}`}>
                {isPositive1d ? <ArrowUpRight className="w-5 h-5 mr-1" /> : <ArrowDownRight className="w-5 h-5 mr-1" />}
                <span data-testid="perf-change-1d">{formatCurrency(Math.abs(performance.change1d))} ({formatPercent(performance.change1dPct)})</span>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Prev Close: {formatCurrency(performance.previousClose)}
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-4 gap-x-6 gap-y-4">
          <MetricItem label="1W Return" value={performance.change1wPct} testId="perf-1w" />
          <MetricItem label="1M Return" value={performance.change1moPct} testId="perf-1mo" />
          <MetricItem label="6M Return" value={performance.change6moPct} testId="perf-6mo" />
          <MetricItem label="1Y Return" value={performance.change1yPct} testId="perf-1y" />
          
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">52W Range</span>
            <div className="text-sm font-mono font-medium text-foreground">
              {performance.week52Low != null && performance.week52High != null ? 
                `${formatCurrency(performance.week52Low)} - ${formatCurrency(performance.week52High)}` : 'N/A'
              }
            </div>
          </div>
          
          <div className="space-y-1 col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">vs {performance.indexComparison || 'Index'} (1Y)</span>
            <div className="flex items-center text-sm font-mono font-medium">
              <span className="text-foreground">{formatPercent(performance.indexPerformance1y)}</span>
              {performance.outperforming != null && (
                <span className={`ml-2 px-2 py-0.5 rounded-sm text-[10px] ${performance.outperforming ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {performance.outperforming ? 'OUTPERFORM' : 'UNDERPERFORM'}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </Card>
  );
}

function MetricItem({ label, value, testId }: { label: string, value: number | null | undefined, testId: string }) {
  if (value == null) {
    return (
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
        <div className="text-sm font-mono text-muted-foreground">N/A</div>
      </div>
    );
  }

  const isPositive = value > 0;
  const isZero = value === 0;

  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
      <div 
        className={`flex items-center text-sm font-mono font-medium ${isPositive ? 'text-success' : isZero ? 'text-muted-foreground' : 'text-destructive'}`}
        data-testid={testId}
      >
        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : isZero ? <Minus className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
        {formatPercent(value)}
      </div>
    </div>
  );
}
