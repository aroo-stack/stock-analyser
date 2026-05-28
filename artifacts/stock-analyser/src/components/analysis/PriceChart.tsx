import { useState, useMemo } from "react";
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { format } from "date-fns";
import { 
  useFetchPriceHistory, 
  getFetchPriceHistoryQueryKey,
  FetchPriceHistoryPeriod
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS: { label: string; value: FetchPriceHistoryPeriod }[] = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "3Y", value: "3y" },
  { label: "5Y", value: "5y" },
];

export default function PriceChart({ ticker }: { ticker: string }) {
  const [period, setPeriod] = useState<FetchPriceHistoryPeriod>("1y");

  const { data: history, isLoading } = useFetchPriceHistory(
    ticker,
    { period },
    {
      query: {
        enabled: !!ticker,
        queryKey: getFetchPriceHistoryQueryKey(ticker, { period })
      }
    }
  );

  const chartData = useMemo(() => {
    if (!history) return [];
    
    // Merge prices and MAs by date
    const mergedData = new Map<string, any>();
    
    history.prices.forEach(p => {
      mergedData.set(p.date, {
        date: p.date,
        close: p.close,
        volume: p.volume,
        formattedDate: format(new Date(p.date), period === '1mo' || period === '3mo' ? 'MMM d' : 'MMM yyyy')
      });
    });

    history.ma50.forEach(ma => {
      if (mergedData.has(ma.date)) {
        mergedData.get(ma.date).ma50 = ma.value;
      }
    });

    history.ma200.forEach(ma => {
      if (mergedData.has(ma.date)) {
        mergedData.get(ma.date).ma200 = ma.value;
      }
    });

    return Array.from(mergedData.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history, period]);

  // Determine line color based on trend (first vs last data point)
  const lineColor = useMemo(() => {
    if (chartData.length < 2) return "hsl(var(--primary))"; // Default primary
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    if (last > first) return "hsl(var(--success))"; // Green
    if (last < first) return "hsl(var(--destructive))"; // Red
    return "hsl(var(--primary))"; // Blue/sideways
  }, [chartData]);

  return (
    <Card className="p-6 border-border bg-card shadow-sm flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">Price History & Volume</h2>
        <div className="flex space-x-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                period === p.value 
                  ? "bg-primary/20 text-primary font-bold border border-primary/30" 
                  : "bg-transparent text-muted-foreground hover:bg-muted border border-transparent"
              }`}
              data-testid={`btn-period-${p.value}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[400px] w-full mt-4">
        {isLoading ? (
          <Skeleton className="w-full h-full opacity-20" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                yAxisId="price"
                domain={['auto', 'auto']}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <YAxis 
                yAxisId="volume" 
                orientation="right" 
                domain={[0, 'auto']} 
                hide 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))", 
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  borderRadius: "6px"
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                formatter={(value: number, name: string) => {
                  if (name === "volume") return [value.toLocaleString(), "Volume"];
                  return [`$${value.toFixed(2)}`, name === "close" ? "Price" : name.toUpperCase()];
                }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: "12px", paddingTop: "10px" }}
              />
              <Bar 
                yAxisId="volume" 
                dataKey="volume" 
                fill="hsl(var(--muted-foreground))" 
                fillOpacity={0.2} 
                name="Volume"
                barSize={4}
              />
              <Line 
                yAxisId="price" 
                type="monotone" 
                dataKey="close" 
                stroke={lineColor} 
                strokeWidth={2}
                dot={false} 
                activeDot={{ r: 4, fill: lineColor, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                name="Price"
              />
              <Line 
                yAxisId="price" 
                type="monotone" 
                dataKey="ma50" 
                stroke="#fbbf24" // Amber for MA50
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false} 
                name="50 DMA"
                connectNulls
              />
              <Line 
                yAxisId="price" 
                type="monotone" 
                dataKey="ma200" 
                stroke="#a78bfa" // Lighter amber/purple for MA200
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false} 
                name="200 DMA"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm">
            No price history available.
          </div>
        )}
      </div>
    </Card>
  );
}
