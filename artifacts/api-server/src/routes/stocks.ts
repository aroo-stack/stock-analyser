import { Router, type IRouter } from "express";
import {
  fetchStockHistory,
  fetchQuote,
  fetchStockNews,
  searchTickers,
  calcTrendDirection,
  calcPerfFromHistory,
  calcCAGR,
} from "../lib/stockData";
import { generateStockAIAnalysis } from "../lib/stockAI";
import { getAIStockPicks } from "../lib/stockPicks";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /stocks/picks
router.get("/stocks/picks", async (req, res): Promise<void> => {
  try {
    req.log.info("Generating AI stock picks");
    const picks = await getAIStockPicks();
    res.json(picks);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err: msg }, "Stock picks failed");
    res.status(500).json({ error: "Failed to generate stock picks" });
  }
});

// GET /stocks/search?q=AAPL
router.get("/stocks/search", async (req, res): Promise<void> => {
  const q = req.query["q"];
  if (!q || typeof q !== "string" || q.trim().length < 1) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  try {
    const results = await searchTickers(q.trim());
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Stock search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /stocks/:ticker/history?period=1y
router.get("/stocks/:ticker/history", async (req, res): Promise<void> => {
  const rawTicker = Array.isArray(req.params.ticker) ? req.params.ticker[0] : req.params.ticker;
  const ticker = rawTicker?.toUpperCase();
  if (!ticker) {
    res.status(400).json({ error: "Ticker is required" });
    return;
  }

  const period = (req.query["period"] as string) || "1y";
  const validPeriods = ["1mo", "3mo", "6mo", "1y", "3y", "5y"] as const;
  type ValidPeriod = typeof validPeriods[number];

  if (!validPeriods.includes(period as ValidPeriod)) {
    res.status(400).json({ error: "Invalid period. Use: 1mo, 3mo, 6mo, 1y, 3y, 5y" });
    return;
  }

  try {
    const history = await fetchStockHistory(ticker, period as ValidPeriod);
    res.json(history);
  } catch (err: any) {
    req.log.warn({ ticker, err: err.message }, "History fetch failed");
    if (err.message?.includes("No historical") || err.message?.includes("not found")) {
      res.status(404).json({ error: `Ticker '${ticker}' not found` });
    } else {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  }
});

// GET /stocks/:ticker/analysis
router.get("/stocks/:ticker/analysis", async (req, res): Promise<void> => {
  const rawTicker = Array.isArray(req.params.ticker) ? req.params.ticker[0] : req.params.ticker;
  const ticker = rawTicker?.toUpperCase();
  if (!ticker) {
    res.status(400).json({ error: "Ticker is required" });
    return;
  }

  try {
    req.log.info({ ticker }, "Fetching full stock analysis");

    // Fetch quote, histories, and news in parallel
    const [quote, history1y, history3y, history5y, rawNews] = await Promise.all([
      fetchQuote(ticker),
      fetchStockHistory(ticker, "1y").catch(() => ({ ticker, prices: [], ma50: [], ma200: [] })),
      fetchStockHistory(ticker, "3y").catch(() => ({ ticker, prices: [], ma50: [], ma200: [] })),
      fetchStockHistory(ticker, "5y").catch(() => ({ ticker, prices: [], ma50: [], ma200: [] })),
      fetchStockNews(ticker),
    ]);
    req.log.info({ ticker, newsCount: rawNews.length }, "Fetched live news");

    // Price performance
    const change1d = Math.round((quote.currentPrice - quote.previousClose) * 100) / 100;
    const change1dPct = Math.round(((change1d / quote.previousClose) * 100) * 100) / 100;

    const perfFromHistory = calcPerfFromHistory(ticker, history1y.prices, quote.currentPrice);

    // Index reference (use S&P 500 for US, etc.)
    const indexComparison = quote.exchange?.includes("ASX") ? "ASX 200" : "S&P 500";
    // Approximate index perf - we'll note it as N/A since we don't have a live index feed
    const indexPerformance1y: number | null = null;
    const outperforming: boolean | null = null;

    // CAGR calculations
    const cagr = calcCAGR(history1y.prices, history3y.prices, history5y.prices, quote.currentPrice);

    // Trend direction
    const trendDirection = calcTrendDirection(quote.currentPrice, quote.ma50, quote.ma200);

    // Projected growth (simple extrapolation from CAGR)
    const baseCagr = cagr.cagr3y ?? cagr.cagr1y ?? null;
    const projectedLow = baseCagr != null ? Math.round((baseCagr * 0.6) * 100) / 100 : null;
    const projectedHigh = baseCagr != null ? Math.round((baseCagr * 1.4) * 100) / 100 : null;

    // Support & resistance from 3-month price history (last ~63 trading days)
    const recent3mo = history1y.prices.slice(-63);
    const supportLevel = recent3mo.length > 0
      ? Math.round(Math.min(...recent3mo.map((p) => p.low)) * 100) / 100
      : null;
    const resistanceLevel = recent3mo.length > 0
      ? Math.round(Math.max(...recent3mo.map((p) => p.high)) * 100) / 100
      : null;

    // Volume comparison
    const volumeVsAvg: string | null = (() => {
      if (!quote.currentVolume || !quote.avgVolume) return null;
      const ratio = quote.currentVolume / quote.avgVolume;
      if (ratio > 1.5) return "significantly higher than average";
      if (ratio > 1.1) return "slightly above average";
      if (ratio < 0.7) return "significantly lower than average";
      if (ratio < 0.9) return "slightly below average";
      return "near average";
    })();

    // Generate AI analysis (includes news labelling in same call)
    const aiAnalysis = await generateStockAIAnalysis(
      quote,
      { change1yPct: perfFromHistory.change1yPct, change6moPct: perfFromHistory.change6moPct, indexComparison, indexPerformance1y },
      cagr,
      trendDirection,
      projectedLow,
      projectedHigh,
      rawNews
    );

    const analysis = {
      overview: {
        name: quote.name,
        ticker: quote.ticker,
        exchange: quote.exchange,
        sector: quote.sector,
        industry: quote.industry,
        description: quote.description,
        currency: quote.currency,
        marketCap: quote.marketCap,
        employees: quote.employees,
        website: quote.website,
        country: quote.country,
      },
      performance: {
        currentPrice: quote.currentPrice,
        previousClose: quote.previousClose,
        change1d,
        change1dPct,
        ...perfFromHistory,
        week52High: quote.week52High,
        week52Low: quote.week52Low,
        indexComparison,
        indexPerformance1y,
        outperforming,
      },
      quant: {
        pe: quote.pe,
        pb: quote.pb,
        dividendYield: quote.dividendYield,
        beta: quote.beta,
        eps: quote.eps,
        forwardPE: quote.forwardPE,
        priceToSales: quote.priceToSales,
        debtToEquity: quote.debtToEquity,
        returnOnEquity: quote.returnOnEquity,
        profitMargin: quote.profitMargin,
        revenueGrowth: quote.revenueGrowth,
        earningsGrowth: quote.earningsGrowth,
        currentRatio: quote.currentRatio,
        avgVolume: quote.avgVolume,
        currentVolume: quote.currentVolume,
        volumeVsAvg,
        aboveMA50: quote.ma50 != null ? quote.currentPrice > quote.ma50 : null,
        aboveMA200: quote.ma200 != null ? quote.currentPrice > quote.ma200 : null,
        ma50: quote.ma50,
        ma200: quote.ma200,
        trendDirection,
        analystRating: quote.analystRating,
        targetPrice: quote.targetPrice,
        supportLevel,
        resistanceLevel,
      },
      growth: {
        ...cagr,
        projectedLow,
        projectedHigh,
        projectionBasis: "Based on historical CAGR and current momentum",
        bullScenario: aiAnalysis.bullScenario,
        bearScenario: aiAnalysis.bearScenario,
      },
      liveNews: aiAnalysis.liveNews,
      qualitativeNotes: aiAnalysis.qualitativeNotes,
      simpleExplanation: aiAnalysis.simpleExplanation,
      suggestion: {
        ...aiAnalysis.suggestion,
        disclaimer: aiAnalysis.suggestion.disclaimer,
      },
      generatedAt: new Date().toISOString(),
    };

    res.json(analysis);
  } catch (err: any) {
    req.log.error({ ticker, err: err.message }, "Analysis failed");
    if (err.message?.includes("not found") || err.message?.includes("Invalid ticker")) {
      res.status(404).json({ error: `Ticker '${ticker}' not found` });
    } else {
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  }
});

export default router;
