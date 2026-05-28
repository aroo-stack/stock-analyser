import { Card } from "@/components/ui/card";
import { QuantMetrics as IQuantMetrics } from "@workspace/api-client-react";
import { formatNumber, formatPercent } from "@/lib/format";

export default function QuantMetrics({ metrics }: { metrics: IQuantMetrics }) {
  
  const renderTrend = () => {
    switch(metrics.trendDirection) {
      case 'uptrend': return <span className="text-success font-bold">UPTREND</span>;
      case 'downtrend': return <span className="text-destructive font-bold">DOWNTREND</span>;
      case 'sideways': return <span className="text-primary font-bold">SIDEWAYS</span>;
      default: return <span className="text-muted-foreground">UNKNOWN</span>;
    }
  };

  return (
    <Card className="p-5 border-border bg-card shadow-sm">
      <div className="border-b border-border pb-3 mb-4">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">Quant Metrics</h2>
      </div>

      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
        {/* Valuation */}
        <MetricGroup title="Valuation">
          <MetricRow label="P/E Ratio" value={formatNumber(metrics.pe)} testId="quant-pe" />
          <MetricRow label="Forward P/E" value={formatNumber(metrics.forwardPE)} testId="quant-fwd-pe" />
          <MetricRow label="P/B Ratio" value={formatNumber(metrics.pb)} testId="quant-pb" />
          <MetricRow label="P/S Ratio" value={formatNumber(metrics.priceToSales)} testId="quant-ps" />
        </MetricGroup>

        {/* Profitability */}
        <MetricGroup title="Profitability">
          <MetricRow label="ROE" value={formatPercent(metrics.returnOnEquity)} testId="quant-roe" />
          <MetricRow label="Profit Margin" value={formatPercent(metrics.profitMargin)} testId="quant-margin" />
          <MetricRow label="EPS (TTM)" value={`$${formatNumber(metrics.eps)}`} testId="quant-eps" />
          <MetricRow label="Div Yield" value={formatPercent(metrics.dividendYield)} testId="quant-div" />
        </MetricGroup>

        {/* Technicals */}
        <MetricGroup title="Technicals">
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-muted-foreground font-mono">Trend</span>
            <span className="text-sm font-mono text-right" data-testid="quant-trend">{renderTrend()}</span>
          </div>
          <MetricRow label="Beta" value={formatNumber(metrics.beta)} testId="quant-beta" />
          <MetricRow label="Above 50 DMA" value={metrics.aboveMA50 != null ? (metrics.aboveMA50 ? 'YES' : 'NO') : 'N/A'} valueColor={metrics.aboveMA50 != null ? (metrics.aboveMA50 ? 'text-success' : 'text-destructive') : ''} testId="quant-above50" />
          <MetricRow label="Above 200 DMA" value={metrics.aboveMA200 != null ? (metrics.aboveMA200 ? 'YES' : 'NO') : 'N/A'} valueColor={metrics.aboveMA200 != null ? (metrics.aboveMA200 ? 'text-success' : 'text-destructive') : ''} testId="quant-above200" />
          <MetricRow label="Support" value={metrics.supportLevel != null ? `$${formatNumber(metrics.supportLevel)}` : 'N/A'} valueColor="text-emerald-400" testId="quant-support" />
          <MetricRow label="Resistance" value={metrics.resistanceLevel != null ? `$${formatNumber(metrics.resistanceLevel)}` : 'N/A'} valueColor="text-red-400" testId="quant-resistance" />
        </MetricGroup>

        {/* Volume & Ratings */}
        <MetricGroup title="Liquidity & Ratings">
          <MetricRow label="Avg Vol" value={formatNumber(metrics.avgVolume, 0)} testId="quant-vol" />
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-muted-foreground font-mono">Analyst</span>
            <span className="text-sm font-mono font-bold text-right" data-testid="quant-rating">
              {metrics.analystRating || 'N/A'}
            </span>
          </div>
          <MetricRow label="Target Price" value={metrics.targetPrice ? `$${formatNumber(metrics.targetPrice)}` : 'N/A'} testId="quant-target" />
        </MetricGroup>
      </div>
    </Card>
  );
}

function MetricGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest mb-2 border-b border-border/50 pb-1">{title}</h3>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function MetricRow({ label, value, valueColor = "text-foreground", testId }: { label: string, value: string, valueColor?: string, testId: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
      <span className={`text-sm font-mono font-medium text-right ${valueColor}`} data-testid={testId}>{value}</span>
    </div>
  );
}
