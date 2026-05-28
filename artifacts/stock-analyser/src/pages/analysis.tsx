import { useParams, Link } from "wouter";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
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

export default function Analysis() {
  const params = useParams();
  const ticker = params.ticker?.toUpperCase() || "";

  // Use all requested hooks
  useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: 60000,
    }
  });

  const { data: analysis, isLoading, isError, refetch, isRefetching } = useFetchStockAnalysis(
    ticker,
    {
      query: {
        enabled: !!ticker,
        queryKey: getFetchStockAnalysisQueryKey(ticker),
        retry: false
      }
    }
  );

  if (!ticker) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border py-3 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-md hover:bg-muted" data-testid="link-home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-baseline space-x-3">
            <h1 className="text-2xl font-mono font-bold text-white tracking-tight" data-testid="text-ticker-header">{ticker}</h1>
            {analysis?.overview?.name && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-[400px]">
                {analysis.overview.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-muted-foreground hidden md:inline-block">
            {analysis?.generatedAt ? new Date(analysis.generatedAt).toLocaleTimeString() : "LIVE"}
          </span>
          <button 
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-refresh"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
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
                Could not retrieve data for ticker <strong>{ticker}</strong>. Please verify the symbol and try again.
              </AlertDescription>
            </Alert>
          </div>
        ) : analysis ? (
          <div className="space-y-8 pb-20">
            {/* Main two-column analysis grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column - 8/12 */}
              <div className="xl:col-span-8 space-y-6">
                <PriceChart ticker={ticker} />
                <PricePerformance performance={analysis.performance} />
                {analysis.liveNews && <LiveNews liveNews={analysis.liveNews} />}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GrowthAnalysis growth={analysis.growth} />
                  <Suggestion suggestion={analysis.suggestion} />
                </div>
              </div>

              {/* Right Column - 4/12 */}
              <div className="xl:col-span-4 space-y-6">
                <Overview overview={analysis.overview} />
                <QuantMetrics metrics={analysis.quant} />
                
                {analysis.qualitativeNotes && (
                  <Card className="p-5 border-border bg-card">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Analyst Notes</h3>
                    <p className="text-sm text-foreground leading-relaxed">
                      {analysis.qualitativeNotes}
                    </p>
                  </Card>
                )}
              </div>
            </div>

            {/* Plain English section — full width below analysis */}
            {analysis.simpleExplanation && (
              <div className="border-t border-border pt-8">
                <SimpleExplanation data={analysis.simpleExplanation} ticker={ticker} />
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-8 space-y-6">
        <Card className="h-[500px] p-6 bg-card border-border"><Skeleton className="h-full w-full opacity-20" /></Card>
        <Card className="h-[200px] p-6 bg-card border-border"><Skeleton className="h-full w-full opacity-20" /></Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="h-[300px] p-6 bg-card border-border"><Skeleton className="h-full w-full opacity-20" /></Card>
          <Card className="h-[300px] p-6 bg-card border-border"><Skeleton className="h-full w-full opacity-20" /></Card>
        </div>
      </div>
      <div className="xl:col-span-4 space-y-6">
        <Card className="h-[350px] p-6 bg-card border-border"><Skeleton className="h-full w-full opacity-20" /></Card>
        <Card className="h-[500px] p-6 bg-card border-border"><Skeleton className="h-full w-full opacity-20" /></Card>
      </div>
    </div>
  );
}
