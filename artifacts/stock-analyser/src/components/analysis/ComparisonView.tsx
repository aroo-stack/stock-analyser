import { useState } from "react";
import { Search, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useFindStocks,
  getFindStocksQueryKey,
  useFetchStockAnalysis,
  getFetchStockAnalysisQueryKey,
  type StockAnalysis,
} from "@workspace/api-client-react";

interface Props {
  ticker: string;
  analysis: StockAnalysis;
  onClear: () => void;
}

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtMktCap(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
}

function winner(a: number | null | undefined, b: number | null | undefined, higherIsBetter: boolean): [boolean, boolean] {
  if (a == null || b == null) return [false, false];
  if (a === b) return [false, false];
  return higherIsBetter ? [a > b, b > a] : [a < b, b < a];
}

function Cell({ value, isWinner, isLoser }: { value: string; isWinner: boolean; isLoser: boolean }) {
  const cls = isWinner ? "text-emerald-400 font-bold" : isLoser ? "text-red-400" : "text-foreground";
  return <span className={`${cls} font-mono text-sm`}>{value}</span>;
}

interface CompRow {
  label: string;
  aVal: string;
  bVal: string;
  aWins: boolean;
  bWins: boolean;
}

function buildRows(a: StockAnalysis, b: StockAnalysis): CompRow[] {
  const ap = a.performance;
  const bp = b.performance;
  const aq = a.quant;
  const bq = b.quant;

  function row(label: string, av: number | null | undefined, bv: number | null | undefined, higherIsBetter: boolean, fmtFn: (v: number | null | undefined) => string): CompRow {
    const [aWins, bWins] = winner(av, bv, higherIsBetter);
    return { label, aVal: fmtFn(av), bVal: fmtFn(bv), aWins, bWins };
  }

  const analystRank: Record<string, number> = {
    strongbuy: 5, strong_buy: 5, buy: 4, hold: 3, underperform: 2, sell: 1,
  };
  const aRating = aq?.analystRating?.toLowerCase().replace(/\s/g, "") ?? null;
  const bRating = bq?.analystRating?.toLowerCase().replace(/\s/g, "") ?? null;
  const aRatingNum = aRating ? (analystRank[aRating] ?? 3) : null;
  const bRatingNum = bRating ? (analystRank[bRating] ?? 3) : null;
  const [aRatingWins, bRatingWins] = winner(aRatingNum, bRatingNum, true);

  return [
    { label: "Current Price", aVal: `$${ap.currentPrice.toFixed(2)}`, bVal: `$${bp.currentPrice.toFixed(2)}`, aWins: false, bWins: false },
    row("P/E Ratio", aq?.pe, bq?.pe, false, (v) => fmt(v, 1)),
    row("Forward P/E", aq?.forwardPE, bq?.forwardPE, false, (v) => fmt(v, 1)),
    row("1Y Change", ap.change1yPct, bp.change1yPct, true, fmtPct),
    row("Beta", aq?.beta, bq?.beta, false, (v) => fmt(v, 2)),
    { label: "Market Cap", aVal: fmtMktCap(a.overview.marketCap), bVal: fmtMktCap(b.overview.marketCap), aWins: false, bWins: false },
    { label: "Analyst Rating", aVal: aq?.analystRating ?? "—", bVal: bq?.analystRating ?? "—", aWins: aRatingWins, bWins: bRatingWins },
    row("Target Price", aq?.targetPrice, bq?.targetPrice, true, (v) => v != null ? `$${v.toFixed(2)}` : "—"),
    row("Revenue Growth", aq?.revenueGrowth != null ? aq.revenueGrowth * 100 : null, bq?.revenueGrowth != null ? bq.revenueGrowth * 100 : null, true, (v) => fmtPct(v)),
    row("Profit Margin", aq?.profitMargin != null ? aq.profitMargin * 100 : null, bq?.profitMargin != null ? bq.profitMargin * 100 : null, true, (v) => fmtPct(v)),
  ];
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "uptrend") return <TrendingUp className="w-3.5 h-3.5 inline text-emerald-400" />;
  if (trend === "downtrend") return <TrendingDown className="w-3.5 h-3.5 inline text-red-400" />;
  return <Minus className="w-3.5 h-3.5 inline text-muted-foreground" />;
}

function TickerSearch({ onSelect }: { onSelect: (t: string) => void }) {
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 300);
  const { data: results, isLoading } = useFindStocks(
    { q: dq },
    { query: { enabled: dq.length >= 1, queryKey: getFindStocksQueryKey({ q: dq }) } }
  );

  return (
    <div className="relative w-full max-w-xs">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-muted-foreground" />
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Add ticker to compare…"
        className="pl-9 h-9 text-sm font-mono bg-card border-border focus-visible:border-primary"
        autoFocus
      />
      {dq.length >= 1 && (
        <Card className="absolute top-full mt-1 w-full max-h-[200px] overflow-auto z-50 bg-popover border-border shadow-xl">
          {isLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : results && results.length > 0 ? (
            <ul className="py-1">
              {results.slice(0, 6).map((r) => (
                <li key={`${r.ticker}-${r.exchange}`}>
                  <button
                    onClick={() => { onSelect(r.ticker); setQ(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <span className="font-mono font-bold text-primary text-sm">{r.ticker}</span>
                    <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-xs text-muted-foreground font-mono">No results for "{dq}"</p>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ComparisonView({ ticker, analysis, onClear }: Props) {
  const [compareTicker, setCompareTicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(!compareTicker);

  const { data: compareData, isLoading, isError } = useFetchStockAnalysis(
    compareTicker ?? "",
    {
      query: {
        enabled: !!compareTicker,
        queryKey: getFetchStockAnalysisQueryKey(compareTicker ?? ""),
        retry: false,
      },
    }
  );

  const handleSelect = (t: string) => {
    setCompareTicker(t.toUpperCase());
    setShowSearch(false);
  };

  const handleClearCompare = () => {
    setCompareTicker(null);
    setShowSearch(true);
    onClear();
  };

  if (showSearch && !compareTicker) {
    return (
      <Card className="p-4 border-border bg-card">
        <div className="flex items-center gap-3">
          <TickerSearch onSelect={handleSelect} />
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-5 border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Comparison Loading…</h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-8 w-full opacity-20" />)}
        </div>
      </Card>
    );
  }

  if (isError || !compareData) {
    return (
      <Card className="p-5 border-border bg-card">
        <p className="text-sm text-muted-foreground font-mono">Could not load comparison data for <strong>{compareTicker}</strong>.</p>
        <button onClick={handleClearCompare} className="mt-3 text-xs text-primary font-mono">← Try another ticker</button>
      </Card>
    );
  }

  const rows = buildRows(analysis, compareData);

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Side-by-Side Comparison</h3>
        <button onClick={handleClearCompare} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Clear comparison
        </button>
      </div>

      {/* Ticker headers */}
      <div className="grid grid-cols-3 border-b border-border bg-muted/10">
        <div className="px-4 py-3" />
        <div className="px-4 py-3 border-l border-border">
          <p className="font-mono font-bold text-primary text-base">{ticker}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{analysis.overview.name}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendBadge trend={analysis.quant.trendDirection} />
            <span className="text-[10px] font-mono text-muted-foreground capitalize">{analysis.quant.trendDirection}</span>
          </div>
        </div>
        <div className="px-4 py-3 border-l border-border">
          <p className="font-mono font-bold text-cyan-400 text-base">{compareTicker}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{compareData.overview.name}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendBadge trend={compareData.quant.trendDirection} />
            <span className="text-[10px] font-mono text-muted-foreground capitalize">{compareData.quant.trendDirection}</span>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 hover:bg-muted/10 transition-colors">
            <div className="px-4 py-2.5 flex items-center">
              <span className="text-xs font-mono text-muted-foreground">{row.label}</span>
            </div>
            <div className="px-4 py-2.5 border-l border-border/50 flex items-center">
              <Cell value={row.aVal} isWinner={row.aWins} isLoser={row.bWins && !row.aWins} />
            </div>
            <div className="px-4 py-2.5 border-l border-border/50 flex items-center">
              <Cell value={row.bVal} isWinner={row.bWins} isLoser={row.aWins && !row.bWins} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/10">
        <p className="text-[10px] text-muted-foreground/50 font-mono">Green = better value · Red = worse value · Not financial advice</p>
      </div>
    </Card>
  );
}
