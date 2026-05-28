import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";
import type { StockQuoteData, RawNewsItem } from "./stockData";

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
  rawNews: RawNewsItem[] = []
): Promise<AIAnalysisResult> {
  const newsContext =
    rawNews.length > 0
      ? `\nRecent News Headlines (past 72 hours — prioritise Reuters, Yahoo Finance, MarketWatch, CNBC):\n${rawNews
          .map(
            (n, i) =>
              `${i + 1}. "${n.headline}" — ${n.publisher} (${new Date(n.publishedAt).toLocaleDateString()})`
          )
          .join("\n")}`
      : "\nRecent News: No recent headlines available.";

  const newsItemsFormat =
    rawNews.length > 0
      ? rawNews
          .map((n) => ({
            headline: n.headline,
            publisher: n.publisher,
            url: n.url,
            publishedAt: n.publishedAt,
            sentiment: "Neutral",
            impact: "...",
          }))
          .map((n) => JSON.stringify(n))
          .join(",\n        ")
      : "";

  const prompt = `You are a quantitative stock analysis assistant with access to live news context. Analyse the following stock data and news, then provide:
1. Qualitative notes (2-4 paragraphs covering recent context, sector trends, risks, catalysts — reference specific news where relevant). Be specific and data-grounded.
2. Live news analysis — for each headline, classify it as Positive/Neutral/Negative and explain in one sentence why it matters for the stock.
3. A structured suggestion (NOT financial advice) that factors in current news.

Stock: ${quote.name} (${quote.ticker}) on ${quote.exchange}
Sector: ${quote.sector ?? "N/A"} | Industry: ${quote.industry ?? "N/A"}
Current Price: ${quote.currency} ${quote.currentPrice}
1-Year Change: ${perf.change1yPct != null ? perf.change1yPct.toFixed(2) + "%" : "N/A"}
6-Month Change: ${perf.change6moPct != null ? perf.change6moPct.toFixed(2) + "%" : "N/A"}
Index (${perf.indexComparison}) 1Y: ${perf.indexPerformance1y != null ? perf.indexPerformance1y.toFixed(2) + "%" : "N/A"}

Valuation:
- P/E: ${quote.pe ?? "N/A"}
- Forward P/E: ${quote.forwardPE ?? "N/A"}
- P/B: ${quote.pb ?? "N/A"}
- P/S: ${quote.priceToSales ?? "N/A"}
- Dividend Yield: ${quote.dividendYield != null ? (quote.dividendYield * 100).toFixed(2) + "%" : "N/A"}
- EPS: ${quote.eps ?? "N/A"}

Momentum & Risk:
- Beta: ${quote.beta ?? "N/A"}
- Trend: ${trendDirection}
- Above 50-day MA: ${quote.ma50 != null ? quote.currentPrice > quote.ma50 : "N/A"}
- Above 200-day MA: ${quote.ma200 != null ? quote.currentPrice > quote.ma200 : "N/A"}
- Analyst Rating: ${quote.analystRating ?? "N/A"}
- Target Price: ${quote.targetPrice ?? "N/A"}

Growth:
- CAGR 1Y: ${cagr.cagr1y != null ? cagr.cagr1y.toFixed(2) + "%" : "N/A"}
- CAGR 3Y: ${cagr.cagr3y != null ? cagr.cagr3y.toFixed(2) + "%" : "N/A"}
- CAGR 5Y: ${cagr.cagr5y != null ? cagr.cagr5y.toFixed(2) + "%" : "N/A"}
- Projected 1Y Range: ${projectedLow != null && projectedHigh != null ? projectedLow.toFixed(2) + "% to " + projectedHigh.toFixed(2) + "%" : "N/A"}

Financials:
- Revenue Growth: ${quote.revenueGrowth != null ? (quote.revenueGrowth * 100).toFixed(2) + "%" : "N/A"}
- Earnings Growth: ${quote.earningsGrowth != null ? (quote.earningsGrowth * 100).toFixed(2) + "%" : "N/A"}
- ROE: ${quote.returnOnEquity != null ? (quote.returnOnEquity * 100).toFixed(2) + "%" : "N/A"}
- Profit Margin: ${quote.profitMargin != null ? (quote.profitMargin * 100).toFixed(2) + "%" : "N/A"}
- Debt/Equity: ${quote.debtToEquity ?? "N/A"}
${newsContext}

Respond with ONLY valid JSON in this exact format:
{
  "qualitativeNotes": "...",
  "liveNews": {
    "overallSentiment": "Positive|Neutral|Negative",
    "sentimentScore": 0,
    "summary": "One sentence summarising the current news environment for this stock.",
    "impactBullets": [
      "Bullet 1: how news affects risk (specific and data-grounded)",
      "Bullet 2: how news affects growth outlook",
      "Bullet 3: how news affects valuation or investor perception",
      "Bullet 4: key uncertainty or conflicting signal (omit if fewer than 4 distinct points)"
    ],
    "items": [
      {
        "headline": "exact headline text",
        "publisher": "publisher name",
        "url": null,
        "publishedAt": "ISO date string",
        "sentiment": "Positive|Neutral|Negative",
        "impact": "One sentence explaining why this headline matters for the stock price or fundamentals."
      }
    ]
  },
  "bullScenario": "2-3 sentences: what would need to go right for the stock to perform well over the next 12 months.",
  "bearScenario": "2-3 sentences: what could go wrong and cause underperformance.",
  "simpleExplanation": {
    "whatTheyDo": "1-2 friendly sentences explaining what this company does in plain English, like you're telling a friend. No jargon.",
    "howItsDoing": "2-3 sentences describing the stock trend (going up / down / sideways) and how it compares to the overall market. Use plain language like 'over the past year' or 'recently'. Mention rough % if helpful.",
    "whatNewsMeans": "2-3 sentences summarising the latest news in simple terms — what happened, why it matters, and whether it's good, bad, or neutral for the company. Use friendly language like 'This is good news because...' or 'This could be a concern because...'.",
    "whatNumbersMean": "2-3 sentences explaining what the key numbers say in beginner-friendly language. Explain concepts like P/E ('tells us if the stock is expensive or cheap'), momentum, volatility ('how much the price jumps around'). No formulas.",
    "whatCouldHappen": "2-3 sentences giving a simple balanced view of what might happen next — both the good outcome and the bad. End with something like 'It will depend on earnings, news, and how markets are feeling.'",
    "whoItMightSuit": "1-2 sentences describing what type of person this stock might suit in everyday terms — e.g. 'patient long-term holders', 'people comfortable with ups and downs', 'those looking for steady income'. Not advice."
  },
  "suggestion": {
    "riskProfile": "Aggressive|Moderate|Conservative",
    "view": "Leaning Positive|Neutral|Leaning Negative",
    "reasons": [
      {"label": "Valuation", "detail": "..."},
      {"label": "Momentum", "detail": "..."},
      {"label": "Growth", "detail": "..."},
      {"label": "Risk", "detail": "..."},
      {"label": "News Impact", "detail": "..."}
    ],
    "investorType": ["Growth", "Dividend", "Speculative", "Long-term"],
    "disclaimer": "This is not financial advice. Past performance does not guarantee future results."
  }
}

sentimentScore rules: +5 = all strongly positive news, -5 = all strongly negative, 0 = neutral/mixed. Use the full range.
IMPORTANT: In liveNews.items, use EXACT headlines and publishers from the news context. Set url to null. Fill correct publishedAt ISO strings.${rawNews.length > 0 ? ` There are ${rawNews.length} headlines — include all of them.` : ""}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult;

    // Restore real URLs from raw news by matching headlines
    if (parsed.liveNews?.items) {
      parsed.liveNews.items = parsed.liveNews.items.map((item) => {
        const match = rawNews.find(
          (n) =>
            n.headline.toLowerCase().includes(item.headline.toLowerCase().slice(0, 30)) ||
            item.headline.toLowerCase().includes(n.headline.toLowerCase().slice(0, 30))
        );
        return { ...item, url: match?.url ?? null, publishedAt: match?.publishedAt ?? item.publishedAt };
      });
    }

    logger.info({ ticker: quote.ticker }, "AI analysis generated");
    return parsed;
  } catch (err) {
    logger.error({ err, ticker: quote.ticker }, "AI analysis failed, using fallback");
    return generateFallbackAnalysis(quote, trendDirection, rawNews);
  }
}

function generateFallbackAnalysis(
  quote: StockQuoteData,
  trendDirection: string,
  rawNews: RawNewsItem[]
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

  const overallSentiment: "Positive" | "Neutral" | "Negative" = "Neutral";

  return {
    qualitativeNotes: `${quote.name} (${quote.ticker}) is listed on ${quote.exchange} in the ${quote.sector ?? "Unknown"} sector. The stock is currently in a ${trendDirection} based on moving average analysis. ${quote.analystRating ? `Analyst consensus is "${quote.analystRating}"${quote.targetPrice ? ` with a mean price target of ${quote.currency} ${quote.targetPrice}` : ""}.` : ""} Market conditions and sector-specific trends should be considered alongside technical indicators.`,
    liveNews: {
      items: fallbackNewsItems,
      overallSentiment,
      sentimentScore: 0,
      summary:
        rawNews.length > 0
          ? `${rawNews.length} recent headlines found. Detailed sentiment analysis unavailable — monitor news sources directly.`
          : "No recent news headlines available for this ticker.",
      impactBullets: rawNews.length > 0
        ? ["Review recent headlines for potential price-moving developments."]
        : ["No recent news available to assess impact."],
    },
    bullScenario: `${quote.name} could outperform if its core business accelerates, analyst targets are met, and sector tailwinds persist. A continuation of the current ${trendDirection} with improving fundamentals would support the bull case.`,
    bearScenario: `Key risks include macro headwinds, elevated valuation if ${quote.pe != null ? `P/E of ${quote.pe.toFixed(1)} compresses` : "metrics deteriorate"}, and any negative developments in the ${quote.sector ?? "sector"}. A trend reversal below key moving averages could trigger further selling.`,
    simpleExplanation: {
      whatTheyDo: `${quote.name} is a company listed on ${quote.exchange}${quote.sector ? ` in the ${quote.sector} sector` : ""}. ${quote.description ? quote.description.slice(0, 120) + "..." : "More details are available in the company overview above."}`,
      howItsDoing: `The stock is currently in a ${trendDirection}. ${quote.ma50 != null ? `It is ${quote.currentPrice > quote.ma50 ? "above" : "below"} its 50-day average price, which is one sign of ${quote.currentPrice > quote.ma50 ? "recent strength" : "recent weakness"}.` : ""} Check the price chart above for a visual view of recent performance.`,
      whatNewsMeans: rawNews.length > 0 ? `There are ${rawNews.length} recent news items for this stock. Detailed news analysis was unavailable — check the Live News section above for the latest headlines.` : "Not much recent news available for this stock. It's worth checking financial news sites for the latest updates.",
      whatNumbersMean: `The P/E ratio${quote.pe != null ? ` is ${quote.pe.toFixed(1)}, which means investors are paying $${quote.pe.toFixed(0)} for every $1 of earnings — ${quote.pe > 30 ? "that's on the expensive side" : quote.pe < 15 ? "that looks fairly priced" : "roughly in line with the market"}` : " data is unavailable right now"}. ${quote.beta != null ? `The stock's volatility (beta) is ${quote.beta.toFixed(2)}, meaning it tends to move ${quote.beta > 1.2 ? "more than" : quote.beta < 0.8 ? "less than" : "roughly with"} the broader market.` : ""}`,
      whatCouldHappen: `If the business keeps performing well and the market stays positive, the stock could continue its current trend. On the other hand, any disappointing results, broader market drops, or negative news could push the price lower. It will depend on earnings, news, and how markets are feeling overall.`,
      whoItMightSuit: `${isHighPE ? "This stock might be better suited to growth-oriented investors who are comfortable with higher prices and more volatility." : isLowPE ? "This stock may appeal to value-focused or income investors looking for more reasonably priced companies." : "This stock could suit a range of investors, though it's worth understanding the sector and risks before committing."} As always, consider your own financial situation — this is not financial advice.`,
    },
    suggestion: {
      riskProfile: isHighPE ? "Aggressive" : isLowPE ? "Conservative" : "Moderate",
      view: isPositive ? "Leaning Positive" : trendDirection === "downtrend" ? "Leaning Negative" : "Neutral",
      reasons: [
        {
          label: "Valuation",
          detail:
            pe != null
              ? `P/E of ${pe.toFixed(1)} — ${isHighPE ? "elevated vs market" : isLowPE ? "below market average" : "near market average"}`
              : "Valuation data unavailable",
        },
        {
          label: "Momentum",
          detail: `Price trend is ${trendDirection}${quote.ma50 != null ? `, ${quote.currentPrice > quote.ma50 ? "above" : "below"} 50-day MA` : ""}`,
        },
        {
          label: "Growth",
          detail:
            quote.revenueGrowth != null
              ? `Revenue growth of ${(quote.revenueGrowth * 100).toFixed(1)}% year-over-year`
              : "Growth metrics require further review",
        },
        {
          label: "Risk",
          detail:
            quote.beta != null
              ? `Beta of ${quote.beta.toFixed(2)} indicates ${quote.beta > 1.5 ? "high" : quote.beta < 0.8 ? "low" : "moderate"} volatility vs market`
              : "Risk metrics require further assessment",
        },
        {
          label: "News Impact",
          detail:
            rawNews.length > 0
              ? `${rawNews.length} recent headlines found — review current news for the latest developments.`
              : "No recent news headlines to factor in.",
        },
      ],
      investorType: isHighPE ? ["Growth", "Speculative"] : isLowPE ? ["Dividend", "Long-term"] : ["Growth", "Long-term"],
      disclaimer:
        "This is not financial advice. Past performance does not guarantee future results. Always conduct your own due diligence before making investment decisions.",
    },
  };
}
