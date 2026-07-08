import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import type {
  PortfolioHoldingResult,
  PortfolioTotals,
  PortfolioAllocation,
} from "./portfolioData";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generatePortfolioAISummary(
  holdings: PortfolioHoldingResult[],
  totals: PortfolioTotals,
  allocation: PortfolioAllocation,
): Promise<string> {
  const holdingSummaries = holdings
    .filter((h) => !h.error)
    .map(
      (h) =>
        `- ${h.ticker} (${h.name}): ${h.weight * 100 >= 0.1 ? (h.weight * 100).toFixed(1) : "<0.1"}% weight` +
        (h.marketValue != null
          ? `, value $${h.marketValue.toLocaleString()}`
          : "") +
        (h.gainLossPct != null
          ? `, ${h.gainLossPct >= 0 ? "+" : ""}${h.gainLossPct.toFixed(1)}% total return`
          : "") +
        (h.change1yPct != null
          ? `, 1Y: ${h.change1yPct >= 0 ? "+" : ""}${h.change1yPct.toFixed(1)}%`
          : "") +
        `, trend: ${h.trendDirection}` +
        (h.analystRating ? `, analyst: ${h.analystRating}` : "") +
        (h.sector ? `, sector: ${h.sector}` : ""),
    )
    .join("\n");

  const sectorBreakdown = allocation.bySector
    .map((s) => `${s.sector}: ${(s.weight * 100).toFixed(1)}%`)
    .join(", ");

  const prompt = `You are a quantitative portfolio analysis assistant. Analyse this portfolio and write a concise but insightful summary (3-4 paragraphs).

Cover:
1. Overall portfolio health and recent performance
2. Concentration risks, sector diversification, and correlation risks
3. Key strengths and vulnerabilities
4. Actionable observations (NOT specific buy/sell advice)

Portfolio Overview:
- Total Value: $${totals.totalValue.toLocaleString()}
- Weighted Beta: ${totals.weightedBeta ?? "N/A"}
- Weighted P/E: ${totals.weightedPE ?? "N/A"}

Sector Allocation: ${sectorBreakdown}

Holdings:
${holdingSummaries}

Respond with ONLY the plain text summary (no JSON, no headers, no bullet points). Write 3-4 paragraphs.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();
    if (!content) throw new Error("Empty AI response");
    logger.info(
      { holdingCount: holdings.length },
      "Portfolio AI summary generated",
    );
    return content;
  } catch (err) {
    logger.error({ err }, "Portfolio AI summary failed, using fallback");
    return generateFallbackSummary(holdings, totals, allocation);
  }
}

function generateFallbackSummary(
  holdings: PortfolioHoldingResult[],
  totals: PortfolioTotals,
  allocation: PortfolioAllocation,
): string {
  const valid = holdings.filter((h) => !h.error);
  const uptrend = valid.filter((h) => h.trendDirection === "uptrend").length;
  const downtrend = valid.filter(
    (h) => h.trendDirection === "downtrend",
  ).length;
  const topSector = allocation.bySector[0];
  const concentrated = topSector && topSector.weight > 0.5;

  return (
    `This portfolio contains ${valid.length} holding${valid.length !== 1 ? "s" : ""} with a total value of $${totals.totalValue.toLocaleString()}.` +
    ` ${uptrend} position${uptrend !== 1 ? "s are" : " is"} in an uptrend and ${downtrend} in a downtrend.` +
    (totals.weightedBeta != null
      ? ` Weighted beta is ${totals.weightedBeta.toFixed(2)}.`
      : "") +
    `\n\nSector allocation: ${allocation.bySector.map((s) => `${s.sector} (${(s.weight * 100).toFixed(1)}%)`).join(", ")}.` +
    (concentrated
      ? ` Heavy concentration in ${topSector.sector} represents sector-specific risk.`
      : " Reasonable sector distribution.") +
    `\n\nThis is not financial advice.`
  );
}
