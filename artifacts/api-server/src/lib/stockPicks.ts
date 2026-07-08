import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchQuote } from "./stockData";
import { logger } from "./logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface StockPick {
  ticker: string;
  name: string;
  sector: string | null;
  currency: string;
  currentPrice: number;
  change1dPct: number | null;
  change1yPct: number | null;
  trendDirection: string;
  analystRating: string | null;
  targetPrice: number | null;
  pe: number | null;
  beta: number | null;
  rationale: string;
  conviction: "High" | "Medium";
  category: "Growth" | "Value" | "Dividend" | "Momentum";
}

let picksCache: { picks: StockPick[]; expiresAt: number } | null = null;

const CANDIDATES = [
  "NVDA",
  "MSFT",
  "AAPL",
  "GOOGL",
  "META",
  "AMZN",
  "AMD",
  "AVGO",
  "CRM",
  "ASML",
  "V",
  "MA",
  "JPM",
  "GS",
  "BLK",
  "LLY",
  "UNH",
  "ABBV",
  "COST",
  "HD",
  "WMT",
  "NEE",
  "XOM",
  "CVX",
];

function calcTrend(
  price: number,
  ma50: number | null,
  ma200: number | null,
): string {
  if (!ma50 || !ma200) return "unknown";
  if (price > ma50 && ma50 > ma200) return "uptrend";
  if (price < ma50 && ma50 < ma200) return "downtrend";
  return "sideways";
}

interface CandidateData {
  ticker: string;
  name: string;
  sector: string | null;
  currency: string;
  currentPrice: number;
  previousClose: number;
  change1dPct: number | null;
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  beta: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  analystRating: string | null;
  targetPrice: number | null;
  trendDirection: string;
  debtToEquity: number | null;
}

export async function getAIStockPicks(): Promise<StockPick[]> {
  if (picksCache && picksCache.expiresAt > Date.now()) {
    logger.info("Returning cached stock picks");
    return picksCache.picks;
  }

  const settled = await Promise.allSettled(
    CANDIDATES.map((ticker) => fetchQuote(ticker)),
  );

  const candidates: CandidateData[] = settled
    .map((r, i) => {
      if (r.status === "rejected") return null;
      const q = r.value;
      const change1dPct = q.previousClose
        ? Math.round(
            ((q.currentPrice - q.previousClose) / q.previousClose) * 10000,
          ) / 100
        : null;
      return {
        ticker: CANDIDATES[i],
        name: q.name,
        sector: q.sector,
        currency: q.currency,
        currentPrice: q.currentPrice,
        previousClose: q.previousClose,
        change1dPct,
        pe: q.pe,
        forwardPE: q.forwardPE,
        pb: q.pb,
        beta: q.beta,
        dividendYield: q.dividendYield,
        revenueGrowth: q.revenueGrowth,
        earningsGrowth: q.earningsGrowth,
        profitMargin: q.profitMargin,
        returnOnEquity: q.returnOnEquity,
        analystRating: q.analystRating,
        targetPrice: q.targetPrice,
        trendDirection: calcTrend(q.currentPrice, q.ma50, q.ma200),
        debtToEquity: q.debtToEquity,
      } satisfies CandidateData;
    })
    .filter((c): c is CandidateData => c !== null);

  const summary = candidates
    .map(
      (c) =>
        `${c.ticker} (${c.name}, ${c.sector ?? "N/A"}): price=${c.currentPrice} ${c.currency}` +
        `, PE=${c.pe ?? "N/A"}, fwdPE=${c.forwardPE ?? "N/A"}` +
        `, revGrowth=${c.revenueGrowth != null ? (c.revenueGrowth * 100).toFixed(1) + "%" : "N/A"}` +
        `, beta=${c.beta ?? "N/A"}, trend=${c.trendDirection}` +
        `, analyst=${c.analystRating ?? "N/A"}, target=${c.targetPrice ?? "N/A"}`,
    )
    .join("\n");

  const prompt = `You are a quantitative stock analyst. Based on the following live market data, select exactly 6 stocks that look most compelling to buy RIGHT NOW.

Candidate universe:
${summary}

Return ONLY valid JSON — an array of exactly 6 objects (no markdown, no backticks):
[
  {
    "ticker": "...",
    "rationale": "2-3 sentences with specific data-grounded reason.",
    "conviction": "High|Medium",
    "category": "Growth|Value|Dividend|Momentum"
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const aiPicks = JSON.parse(jsonMatch[0]) as Array<{
      ticker: string;
      rationale: string;
      conviction: "High" | "Medium";
      category: "Growth" | "Value" | "Dividend" | "Momentum";
    }>;

    const picks: StockPick[] = aiPicks
      .map((pick): StockPick | null => {
        const c = candidates.find((x) => x.ticker === pick.ticker);
        if (!c) return null;
        return {
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          currency: c.currency,
          currentPrice: c.currentPrice,
          change1dPct: c.change1dPct,
          change1yPct: null,
          trendDirection: c.trendDirection,
          analystRating: c.analystRating,
          targetPrice: c.targetPrice,
          pe: c.pe,
          beta: c.beta,
          rationale: pick.rationale,
          conviction: pick.conviction,
          category: pick.category,
        };
      })
      .filter((p): p is StockPick => p !== null);

    logger.info(
      { picks: picks.map((p) => p.ticker) },
      "AI stock picks generated",
    );
    picksCache = { picks, expiresAt: Date.now() + 20 * 60 * 1000 };
    return picks;
  } catch (err) {
    logger.error({ err }, "AI picks failed, using fallback");
    const fallback = generateFallbackPicks(candidates);
    picksCache = { picks: fallback, expiresAt: Date.now() + 20 * 60 * 1000 };
    return fallback;
  }
}

function generateFallbackPicks(candidates: CandidateData[]): StockPick[] {
  const scored = candidates
    .map((c) => {
      let score = 0;
      if (c.trendDirection === "uptrend") score += 2;
      if (c.analystRating === "buy" || c.analystRating === "strongBuy")
        score += 2;
      if (c.revenueGrowth != null && c.revenueGrowth > 0.1) score += 1;
      if (c.profitMargin != null && c.profitMargin > 0.15) score += 1;
      if (c.targetPrice != null && c.currentPrice < c.targetPrice) score += 1;
      if (c.pe != null && c.pe < 30) score += 1;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return scored.map((c) => ({
    ticker: c.ticker,
    name: c.name,
    sector: c.sector,
    currency: c.currency,
    currentPrice: c.currentPrice,
    change1dPct: c.change1dPct,
    change1yPct: null,
    trendDirection: c.trendDirection,
    analystRating: c.analystRating,
    targetPrice: c.targetPrice,
    pe: c.pe,
    beta: c.beta,
    rationale: `${c.name} scores well on fundamentals${c.trendDirection === "uptrend" ? " with a confirmed uptrend" : ""}.`,
    conviction: (c.score >= 5 ? "High" : "Medium") as "High" | "Medium",
    category: (c.revenueGrowth != null && c.revenueGrowth > 0.15
      ? "Growth"
      : c.dividendYield != null && c.dividendYield > 0.02
        ? "Dividend"
        : "Momentum") as "Growth" | "Value" | "Dividend" | "Momentum",
  }));
}
