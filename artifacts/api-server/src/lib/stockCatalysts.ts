import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import type { RawNewsItem } from "./stockData";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface CatalystResult {
  ticker: string;
  bulls: string[];
  bears: string[];
  generatedAt: string;
}

export async function generateCatalysts(
  ticker: string,
  companyName: string,
  currentPrice: number,
  targetLow: number | null,
  targetHigh: number | null,
  news: RawNewsItem[],
): Promise<CatalystResult> {
  const newsText =
    news.length > 0
      ? news
          .map((n, i) => `${i + 1}. "${n.headline}" — ${n.publisher}`)
          .join("\n")
      : "No recent news available.";

  const prompt = `You are an institutional equity research analyst covering ${companyName} (${ticker}).
Current price: $${currentPrice}
Analyst target range: Low $${targetLow ?? "N/A"} → High $${targetHigh ?? "N/A"}

Recent news headlines:
${newsText}

Produce ONLY valid JSON with exactly this structure (no markdown, no backticks):
{
  "bulls": ["bullet 1", "bullet 2", "bullet 3"],
  "bears": ["bullet 1", "bullet 2", "bullet 3"]
}

Rules:
- Each bullet is ONE punchy sentence under 25 words
- Bulls: specific structural catalysts that justify the HIGH target (capacity cycles, margin expansion, TAM expansion, new product ramps, AI monetisation)
- Bears: specific structural risks behind the LOW target (margin compression, competition, regulatory risk, valuation stretch, debt)
- Reference company-specific mechanics — no generic commentary
- Raw JSON only`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in catalyst response");
    const parsed = JSON.parse(match[0]);
    logger.info({ ticker }, "Catalysts generated");
    return {
      ticker,
      bulls: ((parsed.bulls ?? []) as string[]).slice(0, 3),
      bears: ((parsed.bears ?? []) as string[]).slice(0, 3),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error({ err, ticker }, "Catalyst generation failed, using fallback");
    return {
      ticker,
      bulls: [
        "Analyst consensus targets imply meaningful upside from current levels.",
        "Revenue growth trajectory supports higher earnings multiples over time.",
        "Positive sector dynamics may drive a valuation re-rating.",
      ],
      bears: [
        "Macro headwinds could compress margins and delay earnings recovery.",
        "Current valuation leaves limited margin of safety if growth disappoints.",
        "Competitive pressure may limit pricing power and revenue expansion.",
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}
