import yahooFinance from "yahoo-finance2";
import { logger } from "./logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = yahooFinance;

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistoryResult {
  ticker: string;
  prices: PricePoint[];
  ma50: { date: string; value: number | null }[];
  ma200: { date: string; value: number | null }[];
}

export interface StockQuoteData {
  name: string;
  ticker: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  currency: string;
  marketCap: number | null;
  employees: number | null;
  website: string | null;
  country: string | null;
  currentPrice: number;
  previousClose: number;
  week52High: number | null;
  week52Low: number | null;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  beta: number | null;
  eps: number | null;
  forwardPE: number | null;
  priceToSales: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  currentRatio: number | null;
  avgVolume: number | null;
  currentVolume: number | null;
  analystRating: string | null;
  targetPrice: number | null;
  ma50: number | null;
  ma200: number | null;
}

export type Period = "1mo" | "3mo" | "6mo" | "1y" | "3y" | "5y";

function periodToDates(period: Period): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case "1mo": from.setMonth(from.getMonth() - 1); break;
    case "3mo": from.setMonth(from.getMonth() - 3); break;
    case "6mo": from.setMonth(from.getMonth() - 6); break;
    case "1y": from.setFullYear(from.getFullYear() - 1); break;
    case "3y": from.setFullYear(from.getFullYear() - 3); break;
    case "5y": from.setFullYear(from.getFullYear() - 5); break;
  }
  return { from, to };
}

function calcMA(
  prices: PricePoint[],
  window: number
): { date: string; value: number | null }[] {
  return prices.map((p, i) => {
    if (i < window - 1) return { date: p.date, value: null };
    const slice = prices.slice(i - window + 1, i + 1);
    const avg = slice.reduce((s, x) => s + x.close, 0) / window;
    return { date: p.date, value: Math.round(avg * 100) / 100 };
  });
}

export async function fetchStockHistory(
  ticker: string,
  period: Period = "1y"
): Promise<StockHistoryResult> {
  const { from, to } = periodToDates(period);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historical: any[] = await yf.historical(ticker, {
    period1: from,
    period2: to,
    interval: "1d",
  });

  if (!historical || historical.length === 0) {
    throw new Error(`No historical data for ${ticker}`);
  }

  const prices: PricePoint[] = historical.map((d) => ({
    date: (d.date instanceof Date ? d.date : new Date(d.date))
      .toISOString()
      .split("T")[0],
    open: d.open ?? 0,
    high: d.high ?? 0,
    low: d.low ?? 0,
    close: d.close ?? 0,
    volume: d.volume ?? 0,
  }));

  const ma50 = calcMA(prices, 50);
  const ma200 = calcMA(prices, 200);

  return { ticker: ticker.toUpperCase(), prices, ma50, ma200 };
}

export async function fetchQuote(ticker: string): Promise<StockQuoteData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quoteResult, summaryResult] = await Promise.allSettled<[any, any]>([
    yf.quote(ticker),
    yf.quoteSummary(ticker, {
      modules: [
        "assetProfile",
        "financialData",
        "defaultKeyStatistics",
        "summaryDetail",
      ],
    }),
  ]);

  if (quoteResult.status === "rejected") {
    throw new Error(`Ticker not found: ${ticker}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = quoteResult.value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any =
    summaryResult.status === "fulfilled" ? summaryResult.value : {};

  const ap = summary?.assetProfile ?? {};
  const fd = summary?.financialData ?? {};
  const ks = summary?.defaultKeyStatistics ?? {};
  const sd = summary?.summaryDetail ?? {};

  if (!q?.regularMarketPrice) {
    throw new Error(`Invalid ticker: ${ticker}`);
  }

  logger.info({ ticker, price: q.regularMarketPrice }, "Fetched quote");

  return {
    name: q.longName ?? q.shortName ?? ticker,
    ticker: q.symbol ?? ticker.toUpperCase(),
    exchange: q.fullExchangeName ?? q.exchange ?? "Unknown",
    sector: ap.sector ?? null,
    industry: ap.industry ?? null,
    description: ap.longBusinessSummary ?? null,
    currency: q.currency ?? "USD",
    marketCap: q.marketCap ?? null,
    employees: ap.fullTimeEmployees ?? null,
    website: ap.website ?? null,
    country: ap.country ?? null,
    currentPrice: q.regularMarketPrice,
    previousClose:
      q.regularMarketPreviousClose ?? q.regularMarketPrice,
    week52High: q.fiftyTwoWeekHigh ?? null,
    week52Low: q.fiftyTwoWeekLow ?? null,
    pe: q.trailingPE ?? sd.trailingPE ?? null,
    pb: ks.priceToBook ?? null,
    dividendYield: sd.dividendYield ?? q.dividendYield ?? null,
    beta: sd.beta ?? q.beta ?? null,
    eps: q.epsTrailingTwelveMonths ?? null,
    forwardPE: q.forwardPE ?? null,
    priceToSales: ks.priceToSalesTrailing12Months ?? null,
    debtToEquity: fd.debtToEquity ?? null,
    returnOnEquity: fd.returnOnEquity ?? null,
    profitMargin: fd.profitMargins ?? null,
    revenueGrowth: fd.revenueGrowth ?? null,
    earningsGrowth: fd.earningsGrowth ?? null,
    currentRatio: fd.currentRatio ?? null,
    avgVolume:
      q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null,
    currentVolume: q.regularMarketVolume ?? null,
    analystRating: fd.recommendationKey ?? null,
    targetPrice: fd.targetMeanPrice ?? null,
    ma50: q.fiftyDayAverage ?? null,
    ma200: q.twoHundredDayAverage ?? null,
  };
}

export interface RawNewsItem {
  headline: string;
  publisher: string;
  url: string | null;
  publishedAt: string;
}

export async function fetchStockNews(ticker: string): Promise<RawNewsItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await yf.search(ticker, { quotesCount: 0, newsCount: 8 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const news: any[] = results?.news ?? [];
    return news.slice(0, 7).map((item) => ({
      headline: item.title ?? "Untitled",
      publisher: item.publisher ?? "Unknown",
      url: item.link ?? null,
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
    }));
  } catch (err) {
    logger.warn({ ticker, err }, "Failed to fetch stock news");
    return [];
  }
}

export async function searchTickers(
  query: string
): Promise<
  { ticker: string; name: string; exchange: string | null; type: string | null }[]
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any = await yf.search(query, { quotesCount: 10 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (results?.quotes ?? []).filter((r: any) => r.symbol && (r.shortname || r.longname)).map((r: any) => ({
    ticker: r.symbol,
    name: r.shortname ?? r.longname ?? r.symbol,
    exchange: r.exchDisp ?? r.exchange ?? null,
    type: r.quoteType ?? null,
  }));
}

export function calcTrendDirection(
  price: number,
  ma50: number | null,
  ma200: number | null
): "uptrend" | "downtrend" | "sideways" | "unknown" {
  if (!ma50 || !ma200) return "unknown";
  if (price > ma50 && ma50 > ma200) return "uptrend";
  if (price < ma50 && ma50 < ma200) return "downtrend";
  return "sideways";
}

export function calcPerfFromHistory(
  _ticker: string,
  history1y: PricePoint[],
  currentPrice: number
): {
  change1w: number | null;
  change1wPct: number | null;
  change1mo: number | null;
  change1moPct: number | null;
  change6mo: number | null;
  change6moPct: number | null;
  change1y: number | null;
  change1yPct: number | null;
} {
  function getHistoricalPrice(daysAgo: number): number | null {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    const targetStr = target.toISOString().split("T")[0];
    const sorted = [...history1y]
      .filter((p) => p.date <= targetStr)
      .sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.close ?? null;
  }

  function diff(
    old: number | null
  ): { change: number | null; pct: number | null } {
    if (!old) return { change: null, pct: null };
    const change = currentPrice - old;
    const pct = (change / old) * 100;
    return {
      change: Math.round(change * 100) / 100,
      pct: Math.round(pct * 100) / 100,
    };
  }

  const d1w = diff(getHistoricalPrice(7));
  const d1mo = diff(getHistoricalPrice(30));
  const d6mo = diff(getHistoricalPrice(180));
  const d1y = diff(getHistoricalPrice(365));

  return {
    change1w: d1w.change,
    change1wPct: d1w.pct,
    change1mo: d1mo.change,
    change1moPct: d1mo.pct,
    change6mo: d6mo.change,
    change6moPct: d6mo.pct,
    change1y: d1y.change,
    change1yPct: d1y.pct,
  };
}

export function calcCAGR(
  history1y: PricePoint[],
  history3y: PricePoint[],
  history5y: PricePoint[],
  currentPrice: number
): { cagr1y: number | null; cagr3y: number | null; cagr5y: number | null } {
  function cagr(prices: PricePoint[], years: number): number | null {
    if (!prices.length) return null;
    const startPrice = prices[0].close;
    if (!startPrice) return null;
    return (
      Math.round(
        (Math.pow(currentPrice / startPrice, 1 / years) - 1) * 100 * 100
      ) / 100
    );
  }

  return {
    cagr1y: cagr(history1y, 1),
    cagr3y: cagr(history3y, 3),
    cagr5y: cagr(history5y, 5),
  };
}
