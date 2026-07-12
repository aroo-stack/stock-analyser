import { logger } from "./logger";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "";
const BASE = "https://api.polygon.io";

async function polyGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("apiKey", POLYGON_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Polygon ${path} failed: ${res.status}`);
  return res.json();
}

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
  bookValuePerShare: number | null;
  evToEbitda: number | null;
  targetLowPrice: number | null;
  targetHighPrice: number | null;
  targetMedianPrice: number | null;
  numberOfAnalysts: number | null;
  forwardEps: number | null;
  forwardEps2y: number | null;
}

export type Period = "1d" | "1mo" | "3mo" | "6mo" | "1y" | "3y" | "5y";

function periodToDates(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case "1d":
      from.setDate(from.getDate() - 1);
      break;
    case "1mo":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3mo":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6mo":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    case "3y":
      from.setFullYear(from.getFullYear() - 3);
      break;
    case "5y":
      from.setFullYear(from.getFullYear() - 5);
      break;
  }
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

function calcMA(
  prices: PricePoint[],
  window: number,
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
  period: Period = "1y",
): Promise<StockHistoryResult> {
  const { from, to } = periodToDates(period);
  const multiplier = period === "1d" ? 5 : 1;
  const timespan = period === "1d" ? "minute" : "day";

  const data = await polyGet(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`,
    { adjusted: "true", sort: "asc", limit: "5000" },
  );

  const results = data.results ?? [];
  if (!results.length) throw new Error(`No history for ${ticker}`);

  const prices: PricePoint[] = results.map((r: any) => ({
    date:
      period === "1d"
        ? new Date(r.t).toISOString()
        : new Date(r.t).toISOString().split("T")[0],
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v,
  }));

  const ma50 = calcMA(prices, 50);
  const ma200 = calcMA(prices, 200);

  return { ticker: ticker.toUpperCase(), prices, ma50, ma200 };
}

export async function fetchQuote(ticker: string): Promise<StockQuoteData> {
  const t = ticker.toUpperCase();
  const today = new Date().toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 86400000 * 3)
    .toISOString()
    .split("T")[0];

  const [detailResult, priceResult] = await Promise.allSettled([
    polyGet(`/v3/reference/tickers/${t}`),
    polyGet(`/v2/aggs/ticker/${t}/range/1/day/${threeDaysAgo}/${today}`, {
      adjusted: "true",
      sort: "desc",
      limit: "2",
    }),
  ]);

  if (detailResult.status === "rejected")
    throw new Error(`Ticker '${ticker}' not found`);

  const detail = (detailResult.value as any)?.results ?? {};
  if (!detail.ticker) throw new Error(`Ticker '${ticker}' not found`);

  const priceResults =
    priceResult.status === "fulfilled"
      ? ((priceResult.value as any)?.results ?? [])
      : [];

  const latestBar = priceResults[0] ?? {};
  const prevBar = priceResults[1] ?? {};

  const currentPrice = latestBar.c ?? 0;
  const previousClose = prevBar.c ?? currentPrice;

  if (!currentPrice) throw new Error(`Ticker '${ticker}' not found`);

  let ma50: number | null = null;
  let ma200: number | null = null;
  try {
    const hist = await fetchStockHistory(ticker, "1y");
    const last50 = hist.prices.slice(-50);
    const last200 = hist.prices.slice(-200);
    if (last50.length >= 50)
      ma50 =
        Math.round((last50.reduce((s, p) => s + p.close, 0) / 50) * 100) / 100;
    if (last200.length >= 200)
      ma200 =
        Math.round((last200.reduce((s, p) => s + p.close, 0) / 200) * 100) /
        100;
  } catch {}

  logger.info({ ticker: t, price: currentPrice }, "Fetched quote from Polygon");

  return {
    name: detail.name ?? t,
    ticker: t,
    exchange: detail.primary_exchange ?? "Unknown",
    sector: detail.sic_description ?? null,
    industry: detail.sic_description ?? null,
    description: detail.description ?? null,
    currency: "USD",
    marketCap: detail.market_cap ?? null,
    employees: detail.total_employees ?? null,
    website: detail.homepage_url ?? null,
    country: detail.locale === "us" ? "United States" : null,
    currentPrice,
    previousClose,
    week52High: null,
    week52Low: null,
    pe: null,
    pb: null,
    dividendYield: null,
    beta: null,
    eps: null,
    forwardPE: null,
    priceToSales: null,
    debtToEquity: null,
    returnOnEquity: null,
    profitMargin: null,
    revenueGrowth: null,
    earningsGrowth: null,
    currentRatio: null,
    avgVolume: prevBar.v ?? null,
    currentVolume: latestBar.v ?? null,
    analystRating: null,
    targetPrice: null,
    ma50,
    ma200,
    bookValuePerShare: null,
    evToEbitda: null,
    targetLowPrice: null,
    targetHighPrice: null,
    targetMedianPrice: null,
    numberOfAnalysts: null,
    forwardEps: null,
    forwardEps2y: null,
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
    const data = await polyGet(`/v2/reference/news`, {
      ticker: ticker.toUpperCase(),
      limit: "8",
      order: "desc",
      sort: "published_utc",
    });
    return (data.results ?? []).slice(0, 7).map((item: any) => ({
      headline: item.title ?? "Untitled",
      publisher: item.publisher?.name ?? "Unknown",
      url: item.article_url ?? null,
      publishedAt: item.published_utc ?? new Date().toISOString(),
    }));
  } catch (err) {
    logger.warn({ ticker, err }, "Failed to fetch stock news");
    return [];
  }
}

export async function searchTickers(
  query: string,
): Promise<
  {
    ticker: string;
    name: string;
    exchange: string | null;
    type: string | null;
  }[]
> {
  const data = await polyGet(`/v3/reference/tickers`, {
    search: query,
    active: "true",
    limit: "20",
    market: "stocks",
  });
  return (data.results ?? []).map((r: any) => ({
    ticker: r.ticker,
    name: r.name ?? r.ticker,
    exchange: r.primary_exchange ?? null,
    type: r.type ?? null,
  }));
}

export function calcTrendDirection(
  price: number,
  ma50: number | null,
  ma200: number | null,
): "uptrend" | "downtrend" | "sideways" | "unknown" {
  if (!ma50 || !ma200) return "unknown";
  if (price > ma50 && ma50 > ma200) return "uptrend";
  if (price < ma50 && ma50 < ma200) return "downtrend";
  return "sideways";
}

export function calcPerfFromHistory(
  _ticker: string,
  history1y: PricePoint[],
  currentPrice: number,
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
  function diff(old: number | null): {
    change: number | null;
    pct: number | null;
  } {
    if (!old) return { change: null, pct: null };
    const change = currentPrice - old;
    const pct = (change / old) * 100;
    return {
      change: Math.round(change * 100) / 100,
      pct: Math.round(pct * 100) / 100,
    };
  }
  return {
    change1w: diff(getHistoricalPrice(7)).change,
    change1wPct: diff(getHistoricalPrice(7)).pct,
    change1mo: diff(getHistoricalPrice(30)).change,
    change1moPct: diff(getHistoricalPrice(30)).pct,
    change6mo: diff(getHistoricalPrice(180)).change,
    change6moPct: diff(getHistoricalPrice(180)).pct,
    change1y: diff(getHistoricalPrice(365)).change,
    change1yPct: diff(getHistoricalPrice(365)).pct,
  };
}

export function calcCAGR(
  history1y: PricePoint[],
  history3y: PricePoint[],
  history5y: PricePoint[],
  currentPrice: number,
): { cagr1y: number | null; cagr3y: number | null; cagr5y: number | null } {
  function cagr(prices: PricePoint[], years: number): number | null {
    if (!prices.length) return null;
    const startPrice = prices[0].close;
    if (!startPrice) return null;
    return (
      Math.round(
        (Math.pow(currentPrice / startPrice, 1 / years) - 1) * 100 * 100,
      ) / 100
    );
  }
  return {
    cagr1y: cagr(history1y, 1),
    cagr3y: cagr(history3y, 3),
    cagr5y: cagr(history5y, 5),
  };
}

export async function fetchEarningsDate(
  ticker: string,
): Promise<{ earningsDate: string | null }> {
  try {
    const data = await polyGet(`/vX/reference/financials`, {
      ticker: ticker.toUpperCase(),
      limit: "1",
      timeframe: "quarterly",
    });
    const filing = data.results?.[0];
    if (filing?.filing_date)
      return { earningsDate: new Date(filing.filing_date).toISOString() };
  } catch (err) {
    logger.warn({ err, ticker }, "fetchEarningsDate failed");
  }
  return { earningsDate: null };
}
