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
  Legend,
  Customized,
} from "recharts";
import { format } from "date-fns";
import {
  useFetchPriceHistory,
  getFetchPriceHistoryQueryKey,
  FetchPriceHistoryPeriod,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS: { label: string; value: FetchPriceHistoryPeriod }[] = [
  { label: "1D", value: "1d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "3Y", value: "3y" },
  { label: "5Y", value: "5y" },
];

function formatDate(dateStr: string, period: FetchPriceHistoryPeriod): string {
  try {
    const d = new Date(dateStr);
    if (period === "1d") return format(d, "h:mm a");
    if (period === "1mo" || period === "3mo") return format(d, "MMM d");
    return format(d, "MMM yyyy");
  } catch {
    return dateStr;
  }
}

// ─── Candlestick renderer ───────────────────────────────────────────────────

interface CandleDatum {
  formattedDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function CandlestickLayer({
  xAxisMap,
  yAxisMap,
  data,
}: {
  xAxisMap?: Record<string, any>;
  yAxisMap?: Record<string, any>;
  data: CandleDatum[];
}) {
  const xAxis = xAxisMap && (Object.values(xAxisMap)[0] as any);
  const yAxis = yAxisMap?.["price"] as any;

  if (!xAxis?.scale || !yAxis?.scale) return null;

  const bandwidth: number =
    typeof xAxis.bandwidth === "function" ? xAxis.bandwidth() : 8;

  return (
    <g>
      {data.map((d, i) => {
        if (d.open == null || d.close == null || d.high == null || d.low == null)
          return null;

        const xBand: number = xAxis.scale(d.formattedDate);
        if (xBand == null || isNaN(xBand)) return null;

        const xCenter = xBand + bandwidth / 2;
        const yHigh: number = yAxis.scale(d.high);
        const yLow: number = yAxis.scale(d.low);
        const yOpen: number = yAxis.scale(d.open);
        const yClose: number = yAxis.scale(d.close);

        const isGreen = d.close >= d.open;
        const color = isGreen ? "#10b981" : "#ef4444";
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
        const bodyW = Math.max(bandwidth * 0.65, 3);

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={xCenter}
              y1={yHigh}
              x2={xCenter}
              y2={yLow}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body */}
            <rect
              x={xCenter - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
              fillOpacity={isGreen ? 0.75 : 1}
              stroke={color}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
}

// ─── Custom OHLC tooltip ────────────────────────────────────────────────────

function CandleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const isGreen = d.close >= d.open;

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 6,
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "hsl(var(--foreground))",
        lineHeight: "1.6",
      }}
    >
      <div style={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>
        {label}
      </div>
      {d.open  != null && <div>O: <span style={{ color: isGreen ? "#10b981" : "#ef4444" }}>${d.open.toFixed(2)}</span></div>}
      {d.high  != null && <div>H: ${d.high.toFixed(2)}</div>}
      {d.low   != null && <div>L: ${d.low.toFixed(2)}</div>}
      {d.close != null && <div>C: <b>${d.close.toFixed(2)}</b></div>}
      {d.volume != null && (
        <div style={{ color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
          Vol: {d.volume.toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function PriceChart({ ticker }: { ticker: string }) {
  const [period, setPeriod] = useState<FetchPriceHistoryPeriod>("1y");
  const [chartMode, setChartMode] = useState<"line" | "candle">("line");

  const { data: history, isLoading } = useFetchPriceHistory(
    ticker,
    { period },
    {
      query: {
        enabled: !!ticker,
        queryKey: getFetchPriceHistoryQueryKey(ticker, { period }),
      },
    }
  );

  const chartData = useMemo(() => {
    if (!history) return [];

    const mergedData = new Map<string, any>();

    history.prices.forEach((p) => {
      const formattedDate = formatDate(p.date, period);
      mergedData.set(p.date, {
        date: p.date,
        formattedDate,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: p.volume,
      });
    });

    history.ma50.forEach((ma) => {
      if (mergedData.has(ma.date)) {
        mergedData.get(ma.date).ma50 = ma.value;
      }
    });

    history.ma200.forEach((ma) => {
      if (mergedData.has(ma.date)) {
        mergedData.get(ma.date).ma200 = ma.value;
      }
    });

    return Array.from(mergedData.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [history, period]);

  const lineColor = useMemo(() => {
    if (chartData.length < 2) return "hsl(var(--primary))";
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    if (last > first) return "hsl(var(--success))";
    if (last < first) return "hsl(var(--destructive))";
    return "hsl(var(--primary))";
  }, [chartData]);

  const showMAs = period !== "1d" && chartMode === "line";
  const title =
    period === "1d"
      ? "Intraday Price (5-min candles)"
      : "Price History & Volume";

  return (
    <Card className="p-6 border-border bg-card shadow-sm flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {/* Chart mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-border">
            {(["line", "candle"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-3 py-1 text-xs font-mono transition-colors ${
                  chartMode === mode
                    ? "bg-primary/20 text-primary font-bold"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                {mode === "line" ? "Line" : "Candle"}
              </button>
            ))}
          </div>

          {/* Period buttons */}
          <div className="flex space-x-1">
            {PERIODS.map((p) => (
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
      </div>

      <div className="h-[400px] w-full mt-4">
        {isLoading ? (
          <Skeleton className="w-full h-full opacity-20" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="formattedDate"
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
                minTickGap={period === "1d" ? 40 : 30}
              />
              <YAxis
                yAxisId="price"
                domain={["auto", "auto"]}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                domain={[0, "auto"]}
                hide
              />

              {chartMode === "line" ? (
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "4px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "volume")
                      return [value.toLocaleString(), "Volume"];
                    return [
                      `$${value.toFixed(2)}`,
                      name === "close"
                        ? "Price"
                        : name.toUpperCase(),
                    ];
                  }}
                />
              ) : (
                <Tooltip content={<CandleTooltip />} />
              )}

              {chartMode === "line" && (
                <Legend
                  wrapperStyle={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    paddingTop: "10px",
                  }}
                />
              )}

              {/* Volume bars (always visible) */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.15}
                name="Volume"
                barSize={4}
                legendType="none"
              />

              {/* Line mode */}
              {chartMode === "line" && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: lineColor,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                  name="Price"
                />
              )}

              {/* Candlestick mode — hidden dummy line to anchor the price yAxis */}
              {chartMode === "candle" && (
                <Line
                  yAxisId="price"
                  dataKey="close"
                  stroke="transparent"
                  dot={false}
                  legendType="none"
                  name="close"
                />
              )}

              {/* MAs — only in line mode for multi-day periods */}
              {showMAs && (
                <>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma50"
                    stroke="#fbbf24"
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
                    stroke="#a78bfa"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    name="200 DMA"
                    connectNulls
                  />
                </>
              )}

              {/* Candlestick overlay */}
              {chartMode === "candle" && (
                <Customized
                  component={(props: any) => (
                    <CandlestickLayer {...props} data={chartData} />
                  )}
                />
              )}
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
