import { useState } from "react";
import { useLocation } from "wouter";
import {
  Search, TrendingUp, Activity, TerminalSquare, Briefcase,
  Sparkles, TrendingDown, Minus, ArrowRight, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useFindStocks,
  getFindStocksQueryKey,
  useGetStockPicks,
  getGetStockPicksQueryKey,
  type StockPick,
} from "@workspace/api-client-react";

const POPULAR_TICKERS = ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN", "META", "TSLA"];

const CATEGORY_COLORS: Record<string, string> = {
  Growth: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Value: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Dividend: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Momentum: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "uptrend") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "downtrend") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function PickCard({ pick, onSelect }: { pick: StockPick; onSelect: (t: string) => void }) {
  const pctColor = (pick.change1dPct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400";
  return (
    <button
      onClick={() => onSelect(pick.ticker)}
      className="w-full text-left rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group p-4 space-y-3"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-primary text-base">{pick.ticker}</span>
            {pick.conviction === "High" && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono px-1.5 py-0">
                HIGH CONVICTION
              </Badge>
            )}
            <Badge className={`${CATEGORY_COLORS[pick.category] ?? "bg-muted text-muted-foreground"} text-[10px] font-mono px-1.5 py-0 border`}>
              {pick.category.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{pick.name}</p>
          {pick.sector && (
            <p className="text-[10px] text-muted-foreground/60 font-mono">{pick.sector}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-white text-sm">
            {pick.currency === "USD" ? "$" : pick.currency}{pick.currentPrice.toFixed(2)}
          </p>
          {pick.change1dPct != null && (
            <p className={`text-xs font-mono ${pctColor}`}>
              {pick.change1dPct >= 0 ? "+" : ""}{pick.change1dPct.toFixed(2)}% today
            </p>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendIcon trend={pick.trendDirection} />
          <span className="capitalize">{pick.trendDirection}</span>
        </span>
        {pick.pe != null && <span>P/E {pick.pe.toFixed(1)}</span>}
        {pick.analystRating && <span className="capitalize">{pick.analystRating}</span>}
        {pick.targetPrice != null && (
          <span>
            Target{" "}
            <span className={pick.targetPrice > pick.currentPrice ? "text-emerald-400" : "text-red-400"}>
              ${pick.targetPrice.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      {/* Rationale */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{pick.rationale}</p>

      {/* CTA */}
      <div className="flex items-center gap-1 text-[11px] font-mono text-primary/70 group-hover:text-primary transition-colors">
        <span>Full Analysis</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  );
}

function PicksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="space-y-1.5 items-end flex flex-col">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data: searchResults, isLoading: isSearching } = useFindStocks(
    { q: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length >= 2,
        queryKey: getFindStocksQueryKey({ q: debouncedQuery }),
      },
    }
  );

  const {
    data: picks,
    isLoading: isLoadingPicks,
    refetch: refetchPicks,
    isRefetching,
  } = useGetStockPicks({
    query: {
      queryKey: getGetStockPicksQueryKey(),
      staleTime: 1000 * 60 * 15, // 15 min cache
    },
  });

  const handleSelectTicker = (ticker: string) => {
    setLocation(`/analyse/${ticker.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen px-4 py-8">
      {/* Search section — centred */}
      <div className="flex flex-col items-center pt-[8vh] pb-10">
        <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
          {/* Branding */}
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-border shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <TerminalSquare className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                QUANT<span className="text-primary">TERM</span>
              </h1>
              <p className="text-muted-foreground max-w-[500px] text-sm md:text-base font-mono">
                Professional-grade equity analysis. Real-time data, quantitative metrics, and performance tracking.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="w-full relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter ticker or company name..."
              className="w-full h-14 pl-12 pr-4 bg-card border-2 border-muted focus-visible:border-primary text-lg font-mono rounded-lg shadow-lg"
              data-testid="input-ticker-search"
            />

            {debouncedQuery.length >= 2 && (
              <Card className="absolute top-full mt-2 w-full max-h-[300px] overflow-auto z-50 bg-popover border-border shadow-xl">
                {isSearching ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <ul className="py-2">
                    {searchResults.map((result) => (
                      <li key={`${result.ticker}-${result.exchange}`}>
                        <button
                          onClick={() => handleSelectTicker(result.ticker)}
                          className="w-full text-left px-4 py-3 hover:bg-muted focus:bg-muted transition-colors flex items-center justify-between"
                          data-testid={`btn-select-${result.ticker}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="font-mono font-bold text-primary">{result.ticker}</span>
                            <span className="text-sm text-foreground truncate max-w-[200px] md:max-w-[300px]">
                              {result.name}
                            </span>
                          </div>
                          <div className="flex space-x-2 text-xs text-muted-foreground font-mono">
                            {result.exchange && <span>{result.exchange}</span>}
                            {result.type && <span>{result.type}</span>}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground font-mono">
                    No results found for "{debouncedQuery}"
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Quick Launch */}
          <div className="w-full space-y-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground font-mono uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Active Instruments</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleSelectTicker(ticker)}
                  className="px-4 py-2 rounded-md bg-card border border-border hover:border-primary hover:text-primary transition-colors text-sm font-mono font-bold"
                  data-testid={`chip-${ticker}`}
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio CTA */}
          <button
            onClick={() => setLocation("/portfolio")}
            className="w-full flex items-center justify-between px-5 py-4 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-mono font-bold text-foreground">Portfolio Analyser</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Enter your holdings for a full AI-powered breakdown
                </p>
              </div>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>

      {/* AI Top Picks — full width section */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                AI Top Picks
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono">
                Live data · AI-selected · Not financial advice
              </p>
            </div>
          </div>
          <button
            onClick={() => refetchPicks()}
            disabled={isRefetching || isLoadingPicks}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {isLoadingPicks ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-mono text-center pb-2">
              Fetching live data on 24 stocks and running AI analysis… ~15s
            </p>
            <PicksSkeleton />
          </div>
        ) : picks && picks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((pick) => (
              <PickCard key={pick.ticker} pick={pick} onSelect={handleSelectTicker} />
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-sm text-muted-foreground font-mono">
              Could not load picks. Try refreshing.
            </CardContent>
          </Card>
        )}

        <p className="text-[10px] text-muted-foreground/40 font-mono text-center mt-6 pb-4">
          Picks are AI-generated from live market data and refreshed periodically. This is not financial advice.
          Always do your own research before investing.
        </p>
      </div>
    </div>
  );
}
