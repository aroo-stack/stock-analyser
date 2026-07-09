import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSectorHeatmap, getGetSectorHeatmapQueryKey, type SectorData } from "@workspace/api-client-react";

type Period = "1d" | "1w" | "1m";

function tileStyle(pct: number | null): string {
  if (pct == null) return "bg-muted/20";
  if (pct > 2)    return "bg-emerald-500/40";
  if (pct > 1)    return "bg-emerald-500/25";
  if (pct > 0)    return "bg-emerald-500/12";
  if (pct > -1)   return "bg-red-500/12";
  if (pct > -2)   return "bg-red-500/25";
  return "bg-red-500/40";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")   return <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />;
  return <Minus className="w-3 h-3 text-muted-foreground flex-shrink-0" />;
}

function SectorTile({ sector, pct }: { sector: SectorData; pct: number | null }) {
  const isPos = pct != null && pct > 0;
  const isNeg = pct != null && pct < 0;
  return (
    <div className={`rounded-lg border border-border/50 p-3 ${tileStyle(pct)} transition-colors`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="text-xs font-mono font-bold text-foreground truncate">{sector.sector}</div>
          <div className="text-[10px] font-mono text-muted-foreground">{sector.etf}</div>
        </div>
        <TrendIcon trend={sector.trend} />
      </div>
      <div className={`text-base font-mono font-bold mt-1.5 ${
        isPos ? "text-emerald-400" : isNeg ? "text-red-400" : "text-muted-foreground"
      }`}>
        {pct != null ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
      </div>
    </div>
  );
}

export default function SectorHeatmap() {
  const [period, setPeriod] = useState<Period>("1d");

  const { data, isLoading, isError, refetch, isRefetching } = useGetSectorHeatmap({
    query: {
      queryKey: getGetSectorHeatmapQueryKey(),
      staleTime: 1000 * 60 * 10,
    },
  });

  const getPct = (item: SectorData): number | null => {
    const v = period === "1d" ? item.change1dPct : period === "1w" ? item.change1wPct : item.change1mPct;
    return v ?? null;
  };

  const broadSectors  = data?.filter(s => !s.theme)  ?? [];
  const themeETFs     = data?.filter(s =>  s.theme)  ?? [];

  const periodLabel = { "1d": "Today", "1w": "1 Week", "1m": "1 Month" }[period];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground font-mono uppercase tracking-wider">
          <span>Market Sectors</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[11px] normal-case">{periodLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-border text-[11px] font-mono">
            {(["1d", "1w", "1m"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 transition-colors ${
                  period === p ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 11 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </div>
      ) : isError || !data || data.length === 0 ? (
        <p className="text-xs font-mono text-muted-foreground text-center py-4">Sector data unavailable</p>
      ) : (
        <div className="space-y-3">
          {/* Broad Sectors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {broadSectors
              .slice()
              .sort((a, b) => (getPct(b) ?? 0) - (getPct(a) ?? 0))
              .map((s) => <SectorTile key={s.etf} sector={s} pct={getPct(s)} />)}
          </div>

          {/* Thematic divider */}
          {themeETFs.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-1">
                <Zap className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">Themes</span>
                <div className="flex-1 h-px bg-violet-500/20" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {themeETFs
                  .slice()
                  .sort((a, b) => (getPct(b) ?? 0) - (getPct(a) ?? 0))
                  .map((s) => <SectorTile key={s.etf} sector={s} pct={getPct(s)} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
