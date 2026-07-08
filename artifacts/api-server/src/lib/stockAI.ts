import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import type { StockQuoteData, RawNewsItem } from "./stockData";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface NewsItem {
  headline: string;
  publisher: string;
  url: string | null;
  publishedAt: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  impact: string;
}

export interface LiveNewsAnalysis {
  items: NewsItem[];
  overallSentiment: "Positive" | "Neutral" | "Negative";
  sentimentScore: number;
  summary: string;
  impactBullets: string[];
}

export interface SimpleExplanation {
  whatTheyDo: string;
  howItsDoing: string;
  whatNewsMeans: string;
  whatNumbersMean: string;
  whatCouldHappen: string;
  whoItMightSuit: string;
}

export interface AIAnalysisResult {
  qualitativeNotes: string;
  liveNews: LiveNewsAnalysis;
  bullScenario: string;
  bearScenario: string;
  simpleExplanation: SimpleExplanation;
  suggestion: {
    riskProfile: "Aggressive" | "Moderate" | "Conservative";
    view: "Leaning Positive" | "Neutral" | "Leaning Negative";
    reasons: { label: string; detail: string }[];
    investorType: string[];
    disclaimer: string;
  };
}

export async function generateStockAIAnalysis(
  quote: StockQuoteData,
  perf: {
    change1yPct: number | null;
    change6moPct: number | null;
    indexComparison: string;
    indexPerformance1y: number | null;
  },
  cagr: { cagr1y: number | null; cagr3y: number | null; cagr5y: number | null },
  trendDirection: string,
  projectedLow: number | null,
  projectedHigh: number | null,
  rawNews: RawNewsItem[] = [],
  realPriceLow: number | null = null,
  realPriceHigh: number | null = null,
  scoreLow: number | null = null,
  scoreHigh: number | null = null,
): Promise<AIAnalysisResult> {
  const newsContext =
    rawNews.length > 0
      ? `\nRecent News Headlines (past 72 hours):\n${rawNews.map((n, i) => `${i + 1}. "${n.headline}" — ${n.publisher} (${new Date(n.publishedAt).toLocaleDateString()})`).join("\n")}`
      : "\nRecent News: No recent headlines available.";

  const prompt = `You are a quantitative stock analysis assistant. Analyse the following stock data and provide a structured analysis.

Stock: ${quote.name} (${quote.ticker}) on ${quote.exchange}
Sector: ${quote.sector ?? "N/A"} | Industry: ${quote.industry ?? "N/A"}
Current Price: ${quote.currency} ${quote.currentPrice}
1-Year Change: ${perf.change1yPct != null ? perf.change1yPct.toFixed(2) + "%" : "N/A"}
6-Month Change: ${perf.change6moPct != null ? perf.change6moPct.toFixed(2) + "%" : "N/A"}

Valuation: P/E=${quote.pe ?? "N/A"}, Forward P/E=${quote.forwardPE ?? "N/A"}, P/B=${quote.pb ?? "N/A"}, EPS=${quote.eps ?? "N/A"}
Momentum: Beta=${quote.beta ?? "N/A"}, Trend=${trendDirection}, Analyst=${quote.analystRating ?? "N/A"}, Target=${quote.targetPrice ?? "N/A"}
Growth: CAGR 1Y=${cagr.cagr1y != null ? cagr.cagr1y.toFixed(2) + "%" : "N/A"}, Revenue Growth=${quote.revenueGrowth != null ? (quote.revenueGrowth * 100).toFixed(2) + "%" : "N/A"}
Price projections: Low=${realPriceLow != null ? quote.currency + " " + realPriceLow.toFixed(2) : "N/A"}, High=${realPriceHigh != null ? quote.currency + " " + realPriceHigh.toFixed(2) : "N/A"}
${newsContext}

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "qualitativeNotes": "2-4 paragraphs of analysis",
  "liveNews": {
    "overallSentiment": "Positive|Neutral|Negative",
    "sentimentScore": 0,
    "summary": "One sentence summary of news environment",
    "impactBullets": ["bullet 1", "bullet 2", "bullet 3"],
    "items": [{"headline": "...", "publisher": "...", "url": null, "publishedAt": "ISO date", "sentiment": "Positive|Neutral|Negative", "impact": "one sentence"}]
  },
  "bullScenario": "2-3 sentences",
  "bearScenario": "2-3 sentences",
  "simpleExplanation": {
    "whatTheyDo": "1-2 plain English sentences",
    "howItsDoing": "2-3 sentences on trend",
    "whatNewsMeans": "2-3 sentences on news",
    "whatNumbersMean": "2-3 sentences on key numbers",
    "whatCouldHappen": "2-3 sentences. Low estimate ${realPriceLow != null ? quote.currency + " " + realPriceLow.toFixed(2) : "N/A"}, high estimate ${realPriceHigh != null ? quote.currency + " " + realPriceHigh.toFixed(2) : "N/A"}.",
    "whoItMightSuit": "1-2 sentences"
  },
  "suggestion": {
    "riskProfile": "Aggressive|Moderate|Conservative",
    "view": "Leaning Positive|Neutral|Leaning Negative",
    "reasons": [{"label": "Valuation", "detail": "..."}, {"label": "Momentum", "detail": "..."}, {"label": "Growth", "detail": "..."}, {"label": "Risk", "detail": "..."}, {"label": "News Impact", "detail": "..."}],
    "investorType": ["Growth", "Long-term"],
    "disclaimer": "This is not financial advice."
  }
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    if (parsed.liveNews?.items) {
      parsed.liveNews.items = parsed.liveNews.items.map((item) => {
        const match = rawNews.find(
          (n) =>
            n.headline
              .toLowerCase()
              .includes(item.headline.toLowerCase().slice(0, 30)) ||
            item.headline
              .toLowerCase()
              .includes(n.headline.toLowerCase().slice(0, 30)),
        );
        return {
          ...item,
          url: match?.url ?? null,
          publishedAt: match?.publishedAt ?? item.publishedAt,
        };
      });
    }
    logger.info({ ticker: quote.ticker }, "AI analysis generated");
    return parsed;
  } catch (err) {
    logger.error(
      { err, ticker: quote.ticker },
      "AI analysis failed, using fallback",
    );
    return generateFallbackAnalysis(quote, trendDirection, rawNews);
  }
}

function generateFallbackAnalysis(
  quote: StockQuoteData,
  trendDirection: string,
  rawNews: RawNewsItem[],
): AIAnalysisResult {
  const isPositive = trendDirection === "uptrend";
  const pe = quote.pe;
  const isHighPE = pe != null && pe > 30;
  const isLowPE = pe != null && pe < 15;
  const fallbackNewsItems: NewsItem[] = rawNews.map((n) => ({
    headline: n.headline,
    publisher: n.publisher,
    url: n.url,
    publishedAt: n.publishedAt,
    sentiment: "Neutral" as const,
    impact: "Monitor this development for potential price impact.",
  }));
  return {
    qualitativeNotes: `${quote.name} (${quote.ticker}) is listed on ${quote.exchange} in the ${quote.sector ?? "Unknown"} sector. Currently in a ${trendDirection}.`,
    liveNews: {
      items: fallbackNewsItems,
      overallSentiment: "Neutral",
      sentimentScore: 0,
      summary:
        rawNews.length > 0
          ? `${rawNews.length} recent headlines found.`
          : "No recent news.",
      impactBullets: ["Review recent headlines for developments."],
    },
    bullScenario: `${quote.name} could outperform if its core business accelerates.`,
    bearScenario: `Key risks include macro headwinds in the ${quote.sector ?? "sector"}.`,
    simpleExplanation: {
      whatTheyDo: `${quote.name} is listed on ${quote.exchange}${quote.sector ? ` in the ${quote.sector} sector` : ""}.`,
      howItsDoing: `The stock is currently in a ${trendDirection}.`,
      whatNewsMeans:
        rawNews.length > 0
          ? `There are ${rawNews.length} recent news items.`
          : "Not much recent news.",
      whatNumbersMean: `P/E ratio${quote.pe != null ? ` is ${quote.pe.toFixed(1)}` : " data unavailable"}.`,
      whatCouldHappen:
        "Performance depends on earnings, news, and market conditions.",
      whoItMightSuit: `${isHighPE ? "Growth investors." : isLowPE ? "Value investors." : "A range of investors."} Not financial advice.`,
    },
    suggestion: {
      riskProfile: isHighPE
        ? "Aggressive"
        : isLowPE
          ? "Conservative"
          : "Moderate",
      view: isPositive
        ? "Leaning Positive"
        : trendDirection === "downtrend"
          ? "Leaning Negative"
          : "Neutral",
      reasons: [
        {
          label: "Valuation",
          detail: pe != null ? `P/E of ${pe.toFixed(1)}` : "Unavailable",
        },
        { label: "Momentum", detail: `Trend is ${trendDirection}` },
        {
          label: "Growth",
          detail:
            quote.revenueGrowth != null
              ? `Revenue growth ${(quote.revenueGrowth * 100).toFixed(1)}%`
              : "Unavailable",
        },
        {
          label: "Risk",
          detail:
            quote.beta != null
              ? `Beta ${quote.beta.toFixed(2)}`
              : "Unavailable",
        },
        {
          label: "News Impact",
          detail:
            rawNews.length > 0
              ? `${rawNews.length} headlines found.`
              : "No recent news.",
        },
      ],
      investorType: isHighPE
        ? ["Growth", "Speculative"]
        : isLowPE
          ? ["Dividend", "Long-term"]
          : ["Growth", "Long-term"],
      disclaimer:
        "This is not financial advice. Past performance does not guarantee future results.",
    },
  };
}
