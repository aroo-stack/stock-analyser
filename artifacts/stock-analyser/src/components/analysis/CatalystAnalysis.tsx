import { useState } from "react";
import { useGetStockCatalysts } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";

interface Props {
  ticker: string;
}

export default function CatalystAnalysis({ ticker }: Props) {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, isError } = useGetStockCatalysts(ticker, {
    query: {
      enabled: !!ticker && enabled,
      queryKey: ["catalysts", ticker],
      staleTime: 6 * 60 * 60 * 1000, // 6 hours
    },
  });

  if (!enabled) {
    return (
      <Card className="p-6 border-border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Catalyst Analysis
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              AI-powered bull &amp; bear case breakdown · powered by Gemini
            </p>
          </div>
          <Zap className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-center py-6">
          <button
            onClick={() => setEnabled(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md font-mono text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Generate Catalyst Analysis
          </button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground font-mono">
          Analyzes recent news to extract specific bull and bear catalysts. Cached for 6h.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border bg-card shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Catalyst Analysis — {ticker}
          </h2>
          {data?.cached && (
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Served from cache</p>
          )}
        </div>
        <Zap className={`w-4 h-4 ${isLoading ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-2">
              <Skeleton className="h-4 w-32 opacity-20" />
              {[0, 1, 2].map((j) => <Skeleton key={j} className="h-3 w-full opacity-15" />)}
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm font-mono text-destructive">
          Failed to generate catalyst analysis. Please try again later.
        </p>
      )}

      {data && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bull Case */}
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Why the High Case Happens
              </h3>
            </div>
            <ul className="space-y-2.5">
              {data.bulls.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground leading-snug">
                  <span className="text-emerald-400 font-bold mt-0.5 shrink-0">●</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bear Case */}
          <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                Why the Low Case Happens
              </h3>
            </div>
            <ul className="space-y-2.5">
              {data.bears.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground leading-snug">
                  <span className="text-red-400 font-bold mt-0.5 shrink-0">●</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
