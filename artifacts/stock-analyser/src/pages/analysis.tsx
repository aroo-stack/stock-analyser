import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, RefreshCw, AlertTriangle, Bookmark, BookmarkCheck, GitCompare, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { 
  useFetchStockAnalysis, 
  getFetchStockAnalysisQueryKey,
  useHealthCheck,
  getHealthCheckQueryKey
} from "@workspace/api-client-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import Overview from "@/components/analysis/Overview";
import PricePerformance from "@/components/analysis/PricePerformance";
import PriceChart from "@/components/analysis/PriceChart";
import QuantMetrics from "@/components/analysis/QuantMetrics";
import GrowthAnalysis from "@/components/analysis/GrowthAnalysis";
import Suggestion from "@/components/analysis/Suggestion";
import LiveNews from "@/components/analysis/LiveNews";
import SimpleExplanation from "@/components/analysis/SimpleExplanation";
import EarningsBanner from "@/components/analysis/EarningsBanner";
import BottomLine from "@/components/analysis/BottomLine";
import TimingScore from "@/components/analysis/TimingScore";
import ExportPDF from "@/components/analysis/ExportPDF";
import ScenarioEngine from "@/components/analysis/ScenarioEngine";
import CatalystAnalysis from "@/components/analysis/CatalystAnalysis";
import ComparisonView from "@/components/analysis/ComparisonView";
import ChatPanel from "@/components/analysis/ChatPanel";
import { useWatchlist } from "@/hooks/use-watchlist";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Analysis() {
  const params = useParams();
  const ticker = params.ticker?.toUpperCase() || "";
  const [showCompare, setShowCompare] = useState(false);

  const { isInWatchlist, toggle } = useWatchlist();

  useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: 60000,
    },
  });

  const { data: analysis, isLoading, isError, refetch, isRefetching } = useFetchStockAnalysis(
    ticker,
    {
      query: {
        enabled: !!ticker,
        queryKey: getFetchStockAnalysisQueryKey(ticker),
        retry: false,
      },
    }
  );

  const { data: earningsData } = useQuery({
    queryKey: ["earnings", ticker],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/stocks/${ticker}/earnings`);
      if (!res.ok) return { earningsDate: null };
      return res.json() as Promise<{ earningsDate: string | null }>;
    },
    enabled: !!ticker,
    staleTime: 1000 * 60 * 60,
  });

  // Build analysis context for chat
  const analysisContext = analysis
    ? [
        `Price: $${analysis.performance.currentPrice}`,
        `Trend: ${analysis.quant.trendDirection}`,
        `P/E: ${analysis.quant.pe ?? "N/A"}`,
        `Analyst Rating: ${analysis.quant.analystRating ?? "N/A"}`,
        `AI View: ${analysis.suggestion.view}`,
        `1Y Change: ${analysis.performance.change1yPct?.toFixed(2) ?? "N/A"}%`,
        `Risk: ${analysis.suggestion.riskProfile}`,
      ].join(" | ")
    : "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = (analysis as any)?.cached === true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedAt = (analysis as any)?.cachedAt as string | undefined;
  const cacheLabel = cached && cachedAt
    ? `Cached · ${Math.max(0, Math.round((Date.now() - new Date(cachedAt).getTime()) / 60000))}m ago`
    : "LIVE";

  if (!ticker) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border py-3 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-md hover:bg-muted"
            data-testid="link-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-baseline space-x-3">
            <h1
              className="text-2xl font-mono font-bold text-white tracking-tight"
              data-testid="text-ticker-header"
            >
              {ticker}
            </h1>
            {analysis?.overview?.name && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-[400px]">
                {analysis.overview.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Cache status */}
          {analysis && (
            <div className="hidden md:flex items-center gap-1 text-xs font-mono text-muted-foreground px-2">
              {cached && <Clock className="w-3 h-3" />}
              <span>{cacheLabel}</span>
            </div>
          )}

          {/* Compare */}
          <button
            onClick={() => setShowCompare((s) => !s)}
            className={`p-2 rounded-md transition-colors ${
              showCompare
                ? "text-primary bg-primary/10 border border-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}
            title="Compare stocks"
          >
            <GitCompare className="w-4 h-4" />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => toggle(ticker)}
            className={`p-2 rounded-md transition-colors ${
              isInWatchlist(ticker)
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}
            title={isInWatchlist(ticker) ? "Remove from watchlist" : "Save to watchlist"}
          >
            {isInWatchlist(ticker) ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* Export PDF */}
          {analysis && (
            <ExportPDF
              ticker={ticker}
              companyName={(analysis as any).overview?.companyName ?? ticker}
            />
          )}

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="refresh-btn p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-primary/5"
            data-testid="btn-refresh"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {isLoading ? (
          <AnalysisSkeleton />
        ) : isError ? (
          <div className="py-12 flex justify-center">
            <Alert variant="destructive" className="max-w-xl bg-destructive/10 border-destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Instrument Not Found</AlertTitle>
              <AlertDescription className="mt-2">
                Could not retrieve data for ticker <strong>{ticker}</strong>. Please verify the
                symbol and try again.
              </AlertDescription>
            </Alert>
          </div>
        ) : analysis ? (
          <div className="space-y-8 pb-20">
            {/* Earnings banner */}
            <EarningsBanner earningsDate={earningsData?.earningsDate ?? null} />

            {/* Comparison view */}
            {showCompare && (
              <ComparisonView
                ticker={ticker}
                analysis={analysis}
                onClear={() => setShowCompare(false)}
              />
            )}

            {/* Main two-column analysis grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column - 8/12 */}
              <div className="xl:col-span-8 space-y-6">
                <PriceChart ticker={ticker} />
                <PricePerformance performance={analysis.performance} />
                {analysis.liveNews && <LiveNews liveNews={analysis.liveNews} />}
                <Suggestion suggestion={analysis.suggestion} />
              </div>

              {/* Right Column - 4/12 */}
              <div className="xl:col-span-4 space-y-6">
                <Overview overview={analysis.overview} />
                {analysis.qualitativeNotes && (
                  <Card className="p-5 border-border bg-card">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
                      Analyst Notes
                    </h3>
                    <p className="text-sm text-foreground leading-relaxed">
                      {analysis.qualitativeNotes}
                    </p>
                  </Card>
                )}
              </div>
            </div>

            {/* Growth Projections + Scenario Engine — side by side */}
            <div className="border-t border-border pt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GrowthAnalysis growth={analysis.growth} />
                <ScenarioEngine
                  quant={analysis.quant as any}
                  currentPrice={analysis.performance.currentPrice}
                  currency={analysis.overview.currency}
                />
              </div>
            </div>

            {/* Quant Metrics — below Scenario Engine */}
            <QuantMetrics metrics={analysis.quant} />

            {/* Catalyst Analysis */}
            <CatalystAnalysis ticker={ticker} />

            {/* Bottom Line */}
            {(analysis as any).bottomLine && (
              <div className="border-t border-border pt-8">
                <BottomLine data={(analysis as any).bottomLine} currentPrice={analysis.performance.currentPrice} />
              </div>
            )}

            {/* Timing Score */}
            {(analysis as any).timingScore && (
              <div className="border-t border-border pt-8">
                <TimingScore data={(analysis as any).timingScore} />
              </div>
            )}

            {/* Plain English section */}
            {analysis.simpleExplanation && (
              <div className="border-t border-border pt-8">
                <SimpleExplanation data={analysis.simpleExplanation} ticker={ticker} />
              </div>
            )}

            {/* Chat panel */}
            <div className="border-t border-border pt-8">
              <ChatPanel ticker={ticker} analysisContext={analysisContext} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[500px] p-6 bg-card border-border">
            <Skeleton className="h-full w-full opacity-20" />
          </Card>
          <Card className="h-[200px] p-6 bg-card border-border">
            <Skeleton className="h-full w-full opacity-20" />
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-[300px] p-6 bg-card border-border">
              <Skeleton className="h-full w-full opacity-20" />
            </Card>
            <Card className="h-[300px] p-6 bg-card border-border">
              <Skeleton className="h-full w-full opacity-20" />
            </Card>
          </div>
        </div>
        <div className="xl:col-span-4 space-y-6">
          <Card className="h-[350px] p-6 bg-card border-border">
            <Skeleton className="h-full w-full opacity-20" />
          </Card>
          <Card className="h-[500px] p-6 bg-card border-border">
            <Skeleton className="h-full w-full opacity-20" />
          </Card>
        </div>
      </div>
    </div>
  );
}
