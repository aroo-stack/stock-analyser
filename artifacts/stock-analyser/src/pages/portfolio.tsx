import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Plus, Trash2, BarChart3, TrendingUp, TrendingDown,
  Minus, ArrowLeft, Loader2, AlertCircle, ChevronRight,
  Briefcase, PieChart, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnalysePortfolio } from "@workspace/api-client-react";
import type { PortfolioHoldingResult, PortfolioAnalysis } from "@workspace/api-client-react";
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface HoldingInput {
  id: string;
  ticker: string;
  shares: string;
  costBasis: string;
}

const SECTOR_COLORS = [
  "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

function pct(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

function money(v: number | null | undefined, currency = "USD"): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "uptrend")
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono text-xs">↑ Uptrend</Badge>;
  if (trend === "downtrend")
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs">↓ Downtrend</Badge>;
  return <Badge className="bg-muted text-muted-foreground font-mono text-xs">→ Sideways</Badge>;
}

function PctCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const color = value >= 0 ? "text-emerald-400" : "text-red-400";
  return <span className={`font-mono font-semibold ${color}`}>{pct(value)}</span>;
}

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [holdings, setHoldings] = useState<HoldingInput[]>([
    { id: "1", ticker: "", shares: "", costBasis: "" },
  ]);
  const [result, setResult] = useState<PortfolioAnalysis | null>(null);

  const { mutate: analysePortfolio, isPending, error } = useAnalysePortfolio({
    mutation: {
      onSuccess: (data) => setResult(data as PortfolioAnalysis),
    },
  });

  const addHolding = () => {
    setHoldings((prev) => [
      ...prev,
      { id: Date.now().toString(), ticker: "", shares: "", costBasis: "" },
    ]);
  };

  const removeHolding = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const updateHolding = (id: string, field: keyof HoldingInput, value: string) => {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  };

  const handleAnalyse = useCallback(() => {
    const valid = holdings.filter((h) => h.ticker.trim().length > 0);
    if (!valid.length) return;
    setResult(null);
    analysePortfolio({
      data: {
        holdings: valid.map((h) => ({
          ticker: h.ticker.trim().toUpperCase(),
          shares: h.shares ? parseFloat(h.shares) : undefined,
          costBasis: h.costBasis ? parseFloat(h.costBasis) : undefined,
        })),
      },
    });
  }, [holdings, analysePortfolio]);

  const validCount = holdings.filter((h) => h.ticker.trim().length > 0).length;

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
              PORTFOLIO ANALYSER
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Enter your holdings and get a full portfolio breakdown
            </p>
          </div>
        </div>
      </div>

      {/* Holdings Entry */}
      <Card className="bg-card border-border mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Your Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 px-1">
            <span className="text-xs text-muted-foreground font-mono uppercase">Ticker</span>
            <span className="text-xs text-muted-foreground font-mono uppercase">Shares</span>
            <span className="text-xs text-muted-foreground font-mono uppercase">Avg Cost</span>
            <span />
          </div>

          {holdings.map((h) => (
            <div key={h.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
              <Input
                value={h.ticker}
                onChange={(e) => updateHolding(h.id, "ticker", e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                className="font-mono font-bold text-primary bg-background border-border h-9"
                maxLength={12}
              />
              <Input
                value={h.shares}
                onChange={(e) => updateHolding(h.id, "shares", e.target.value)}
                placeholder="e.g. 10"
                type="number"
                min="0"
                className="font-mono bg-background border-border h-9"
              />
              <Input
                value={h.costBasis}
                onChange={(e) => updateHolding(h.id, "costBasis", e.target.value)}
                placeholder="e.g. 150.00"
                type="number"
                min="0"
                step="0.01"
                className="font-mono bg-background border-border h-9"
              />
              <button
                onClick={() => removeHolding(h.id)}
                disabled={holdings.length === 1}
                className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addHolding}
              disabled={holdings.length >= 20}
              className="font-mono text-xs border-dashed"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Holding
            </Button>
            <Button
              onClick={handleAnalyse}
              disabled={isPending || validCount === 0}
              className="font-mono text-sm bg-primary text-primary-foreground hover:bg-primary/90 ml-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing…
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" /> Analyse Portfolio
                </>
              )}
            </Button>
          </div>

          {isPending && (
            <p className="text-xs text-muted-foreground font-mono text-center pt-1">
              Fetching live data for {validCount} holding{validCount !== 1 ? "s" : ""} + AI summary… ~15s
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-950/20 border-red-500/30 mb-6">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-mono">
              Analysis failed. Check your ticker symbols and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && <PortfolioResults result={result} onNavigate={setLocation} />}
    </div>
  );
}

function PortfolioResults({
  result,
  onNavigate,
}: {
  result: PortfolioAnalysis;
  onNavigate: (path: string) => void;
}) {
  const { holdings, totals, allocation, aiSummary } = result;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Value"
          value={money(totals.totalValue)}
          sub={totals.change1dPct != null ? `Today ${pct(totals.change1dPct)}` : undefined}
          subColor={totals.change1dPct != null ? (totals.change1dPct >= 0 ? "text-emerald-400" : "text-red-400") : undefined}
        />
        <SummaryCard
          label="Total Return"
          value={totals.totalGainLossPct != null ? pct(totals.totalGainLossPct) : "—"}
          sub={totals.totalGainLoss != null ? money(totals.totalGainLoss) : undefined}
          valueColor={totals.totalGainLossPct != null ? (totals.totalGainLossPct >= 0 ? "text-emerald-400" : "text-red-400") : undefined}
          subColor={totals.totalGainLoss != null ? (totals.totalGainLoss >= 0 ? "text-emerald-400/70" : "text-red-400/70") : undefined}
        />
        <SummaryCard
          label="Portfolio Beta"
          value={totals.weightedBeta != null ? totals.weightedBeta.toFixed(2) : "—"}
          sub={totals.weightedBeta != null ? (totals.weightedBeta > 1.2 ? "High volatility" : totals.weightedBeta < 0.8 ? "Low volatility" : "Moderate") : undefined}
        />
        <SummaryCard
          label="Weighted P/E"
          value={totals.weightedPE != null ? totals.weightedPE.toFixed(1) : "—"}
          sub={`${holdings.filter((h) => !h.error).length} holdings`}
        />
      </div>

      {/* Holdings Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Holdings Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Ticker", "Weight", "Price", "Value", "Return", "1D", "1Y", "Trend", "Analyst", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs text-muted-foreground font-mono uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: PortfolioHoldingResult) => (
                  <tr
                    key={h.ticker}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-mono font-bold text-primary">{h.ticker}</span>
                        {h.error && (
                          <span className="ml-2 text-xs text-red-400">⚠ {h.error}</span>
                        )}
                        {!h.error && (
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{h.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {(h.weight * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {money(h.currentPrice, h.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {h.marketValue != null ? money(h.marketValue, h.currency) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PctCell value={h.gainLossPct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctCell value={h.change1dPct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctCell value={h.change1yPct} />
                    </td>
                    <td className="px-4 py-3">
                      <TrendBadge trend={h.trendDirection} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono capitalize text-muted-foreground">
                      {h.analystRating ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onNavigate(`/analyse/${h.ticker}`)}
                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title={`Full analysis for ${h.ticker}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sector Allocation + AI Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sector Pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PieChart className="w-4 h-4" /> Sector Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RechartsPie>
                <Pie
                  data={allocation.bySector}
                  dataKey="weight"
                  nameKey="sector"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {allocation.bySector.map((_, index) => (
                    <Cell
                      key={index}
                      fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { sector: string; weight: number };
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
                        <p className="text-foreground font-bold">{d.sector}</p>
                        <p className="text-primary">{(d.weight * 100).toFixed(1)}%</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs font-mono text-muted-foreground">{value}</span>
                  )}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Summary */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" /> AI Portfolio Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiSummary ? (
              <div className="space-y-3">
                {aiSummary.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No AI summary available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground/50 font-mono text-center pb-4">
        This analysis is for informational purposes only and does not constitute financial advice.
        Past performance does not guarantee future results.
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  valueColor,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  subColor?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-bold font-mono ${valueColor ?? "text-white"}`}>{value}</p>
        {sub && <p className={`text-xs font-mono mt-0.5 ${subColor ?? "text-muted-foreground"}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}
