import { fetchQuote, fetchStockHistory } from "./stockData";
import { logger } from "./logger";

const SECTOR_ETFS = [
  { etf: "XLK",  name: "Technology",        color: "#6366f1" },
  { etf: "XLV",  name: "Healthcare",        color: "#22c55e" },
  { etf: "XLF",  name: "Financials",        color: "#f59e0b" },
  { etf: "XLY",  name: "Consumer Discret.", color: "#ec4899" },
  { etf: "XLI",  name: "Industrials",       color: "#8b5cf6" },
  { etf: "XLE",  name: "Energy",            color: "#f97316" },
  { etf: "XLU",  name: "Utilities",         color: "#06b6d4" },
  { etf: "XLRE", name: "Real Estate",       color: "#84cc16" },
  { etf: "XLB",  name: "Materials",         color: "#a78bfa" },
  { etf: "XLC",  name: "Comm. Services",    color: "#fb7185" },
  { etf: "XLP",  name: "Consumer Staples",  color: "#34d399" },
];

export interface SectorData {
  sector: string;
  etf: string;
  color: string;
  change1dPct: number | null;
  change1wPct: number | null;
  change1mPct: number | null;
  currentPrice: number;
  trend: "up" | "down" | "flat";
}

let sectorCache: { data: SectorData[]; timestamp: number } | null = null;
const SECTOR_CACHE_TTL = 10 * 60 * 1000;

export async function fetchSectorHeatmap(): Promise<SectorData[]> {
  const now = Date.now();
  if (sectorCache && now - sectorCache.timestamp < SECTOR_CACHE_TTL) {
    return sectorCache.data;
  }

  const results = await Promise.allSettled(
    SECTOR_ETFS.map(async ({ etf, name, color }) => {
      const [quote, history] = await Promise.all([
        fetchQuote(etf),
        fetchStockHistory(etf, "1mo").catch(() => ({ ticker: etf, prices: [], ma50: [], ma200: [] })),
      ]);

      const change1dPct = quote.previousClose > 0
        ? Math.round(((quote.currentPrice - quote.previousClose) / quote.previousClose) * 10000) / 100
        : null;

      const prices = history.prices;
      let change1wPct: number | null = null;
      let change1mPct: number | null = null;

      if (prices.length >= 5) {
        const ref = prices[Math.max(0, prices.length - 6)].close;
        change1wPct = Math.round(((quote.currentPrice - ref) / ref) * 10000) / 100;
      }
      if (prices.length >= 20) {
        const ref = prices[Math.max(0, prices.length - 21)].close;
        change1mPct = Math.round(((quote.currentPrice - ref) / ref) * 10000) / 100;
      }

      const trend: "up" | "down" | "flat" =
        change1dPct == null ? "flat" : change1dPct > 0.1 ? "up" : change1dPct < -0.1 ? "down" : "flat";

      return { sector: name, etf, color, change1dPct, change1wPct, change1mPct, currentPrice: quote.currentPrice, trend };
    })
  );

  const data: SectorData[] = results
    .filter((r): r is PromiseFulfilledResult<SectorData> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => (b.change1dPct ?? 0) - (a.change1dPct ?? 0));

  if (data.length > 0) sectorCache = { data, timestamp: now };
  else logger.warn("Sector heatmap: all ETF fetches failed");

  return data;
}
