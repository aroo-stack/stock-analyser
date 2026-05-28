import { fetchQuote, calcTrendDirection, calcPerfFromHistory, fetchStockHistory } from "./stockData";
import { logger } from "./logger";

export interface PortfolioHoldingInput {
  ticker: string;
  shares?: number | null;
  costBasis?: number | null;
}

export interface PortfolioHoldingResult {
  ticker: string;
  name: string;
  sector: string | null;
  currency: string;
  shares: number | null;
  costBasis: number | null;
  currentPrice: number;
  marketValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  weight: number;
  change1dPct: number | null;
  change1yPct: number | null;
  trendDirection: string;
  analystRating: string | null;
  targetPrice: number | null;
  beta: number | null;
  pe: number | null;
  error: string | null;
}

export interface PortfolioTotals {
  totalValue: number;
  totalCost: number | null;
  totalGainLoss: number | null;
  totalGainLossPct: number | null;
  weightedBeta: number | null;
  weightedPE: number | null;
  change1dValue: number | null;
  change1dPct: number | null;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  weight: number;
}

export interface PortfolioAllocation {
  bySector: SectorAllocation[];
}

export interface PortfolioDataResult {
  holdings: PortfolioHoldingResult[];
  totals: PortfolioTotals;
  allocation: PortfolioAllocation;
}

export async function buildPortfolioData(
  inputs: PortfolioHoldingInput[]
): Promise<PortfolioDataResult> {
  // Fetch all quotes and 1y histories in parallel
  const settled = await Promise.allSettled(
    inputs.map(async (h) => {
      const ticker = h.ticker.toUpperCase();
      const [quote, history1y] = await Promise.allSettled([
        fetchQuote(ticker),
        fetchStockHistory(ticker, "1y"),
      ]);

      if (quote.status === "rejected") {
        throw new Error(`Ticker '${ticker}' not found: ${quote.reason}`);
      }

      const q = quote.value;
      const hist = history1y.status === "fulfilled" ? history1y.value.prices : [];

      const trendDirection = calcTrendDirection(q.currentPrice, q.ma50, q.ma200);
      const perf = calcPerfFromHistory(ticker, hist, q.currentPrice);

      const change1d = Math.round((q.currentPrice - q.previousClose) * 100) / 100;
      const change1dPct = q.previousClose
        ? Math.round(((change1d / q.previousClose) * 100) * 100) / 100
        : null;

      const shares = h.shares ?? null;
      const costBasis = h.costBasis ?? null;
      const marketValue = shares != null ? Math.round(shares * q.currentPrice * 100) / 100 : null;
      const totalCostForHolding = shares != null && costBasis != null ? shares * costBasis : null;
      const gainLoss =
        marketValue != null && totalCostForHolding != null
          ? Math.round((marketValue - totalCostForHolding) * 100) / 100
          : null;
      const gainLossPct =
        gainLoss != null && totalCostForHolding != null && totalCostForHolding > 0
          ? Math.round((gainLoss / totalCostForHolding) * 100 * 100) / 100
          : null;

      return {
        ticker,
        name: q.name,
        sector: q.sector,
        currency: q.currency,
        shares,
        costBasis,
        currentPrice: q.currentPrice,
        marketValue,
        gainLoss,
        gainLossPct,
        weight: 0, // computed after all fetched
        change1dPct,
        change1yPct: perf.change1yPct,
        trendDirection,
        analystRating: q.analystRating,
        targetPrice: q.targetPrice,
        beta: q.beta,
        pe: q.pe,
        error: null,
      };
    })
  );

  const holdings: PortfolioHoldingResult[] = settled.map((s, i) => {
    if (s.status === "rejected") {
      const ticker = inputs[i].ticker.toUpperCase();
      logger.warn({ ticker, err: s.reason }, "Failed to fetch holding");
      return {
        ticker,
        name: ticker,
        sector: null,
        currency: "USD",
        shares: inputs[i].shares ?? null,
        costBasis: inputs[i].costBasis ?? null,
        currentPrice: 0,
        marketValue: null,
        gainLoss: null,
        gainLossPct: null,
        weight: 0,
        change1dPct: null,
        change1yPct: null,
        trendDirection: "unknown",
        analystRating: null,
        targetPrice: null,
        beta: null,
        pe: null,
        error: `Could not fetch data for ${ticker}`,
      };
    }
    return s.value;
  });

  // Compute total portfolio value (only holdings with market value)
  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue ?? h.currentPrice), 0);

  // Assign weights
  for (const h of holdings) {
    const val = h.marketValue ?? h.currentPrice;
    h.weight = totalValue > 0 ? Math.round((val / totalValue) * 10000) / 10000 : 0;
  }

  // Totals
  const holdingsWithValue = holdings.filter((h) => h.marketValue != null);
  const totalCostArr = holdingsWithValue.map((h) =>
    h.shares != null && h.costBasis != null ? h.shares * h.costBasis : null
  );
  const allHaveCost = totalCostArr.every((c) => c != null);
  const totalCost = allHaveCost && totalCostArr.length > 0
    ? Math.round(totalCostArr.reduce((s, c) => s + (c ?? 0), 0) * 100) / 100
    : null;
  const totalGainLoss =
    totalCost != null
      ? Math.round((totalValue - totalCost) * 100) / 100
      : null;
  const totalGainLossPct =
    totalGainLoss != null && totalCost != null && totalCost > 0
      ? Math.round((totalGainLoss / totalCost) * 100 * 100) / 100
      : null;

  // Weighted beta and PE (by market value weight)
  const weightedBeta = (() => {
    const valid = holdings.filter((h) => h.beta != null && h.weight > 0);
    if (!valid.length) return null;
    return Math.round(valid.reduce((s, h) => s + h.beta! * h.weight, 0) * 100) / 100;
  })();

  const weightedPE = (() => {
    const valid = holdings.filter((h) => h.pe != null && h.weight > 0);
    if (!valid.length) return null;
    return Math.round(valid.reduce((s, h) => s + h.pe! * h.weight, 0) * 100) / 100;
  })();

  // 1-day P&L
  const change1dValue = holdingsWithValue.length
    ? Math.round(
        holdingsWithValue.reduce((s, h) => {
          if (h.change1dPct == null || h.marketValue == null) return s;
          return s + (h.marketValue * h.change1dPct) / (100 + h.change1dPct);
        }, 0) * 100
      ) / 100
    : null;
  const change1dPct =
    change1dValue != null && totalValue > 0
      ? Math.round((change1dValue / totalValue) * 100 * 100) / 100
      : null;

  // Sector allocation
  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    const s = h.sector ?? "Unknown";
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + (h.marketValue ?? h.currentPrice));
  }
  const bySector: SectorAllocation[] = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({
      sector,
      value: Math.round(value * 100) / 100,
      weight: totalValue > 0 ? Math.round((value / totalValue) * 10000) / 10000 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    holdings,
    totals: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost,
      totalGainLoss,
      totalGainLossPct,
      weightedBeta,
      weightedPE,
      change1dValue,
      change1dPct,
    },
    allocation: { bySector },
  };
}
