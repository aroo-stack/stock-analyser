import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";
import type { PortfolioHoldingResult, PortfolioTotals, PortfolioAllocation } from "./portfolioData";

export async function generatePortfolioAISummary(
  holdings: PortfolioHoldingResult[],
  totals: PortfolioTotals,
  allocation: PortfolioAllocation
): Promise<string> {
  const holdingSummaries = holdings
    .filter((h) => !h.error)
    .map(
      (h) =>
        `- ${h.ticker} (${h.name}): ${h.weight * 100 >= 0.1 ? (h.weight * 100).toFixed(1) : "<0.1"}% weight` +
        (h.marketValue != null ? `, value $${h.marketValue.toLocaleString()}` : "") +
        (h.gainLossPct != null ? `, ${h.gainLossPct >= 0 ? "+" : ""}${h.gainLossPct.toFixed(1)}% total return` : "") +
        (h.change1yPct != null ? `, 1Y: ${h.change1yPct >= 0 ? "+" : ""}${h.change1yPct.toFixed(1)}%` : "") +
        `, trend: ${h.trendDirection}` +
        (h.analystRating ? `, analyst: ${h.analystRating}` : "") +
        (h.sector ? `, sector: ${h.sector}` : "")
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
- Total Value: $${totals.totalValue.toLocaleString()}${totals.totalGainLossPct != null ? `\n- Total Return: ${totals.totalGainLossPct >= 0 ? "+" : ""}${totals.totalGainLossPct.toFixed(2)}%` : ""}
- Weighted Beta: ${totals.weightedBeta ?? "N/A"}
- Weighted P/E: ${totals.weightedPE ?? "N/A"}${totals.change1dPct != null ? `\n- 1-Day Change: ${totals.change1dPct >= 0 ? "+" : ""}${totals.change1dPct.toFixed(2)}%` : ""}

Sector Allocation: ${sectorBreakdown}

Holdings:
${holdingSummaries}

Respond with ONLY the plain text summary (no JSON, no headers, no bullet points). Write 3-4 paragraphs.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("Empty AI response");
    logger.info({ holdingCount: holdings.length }, "Portfolio AI summary generated");
    return content;
  } catch (err) {
    logger.error({ err }, "Portfolio AI summary failed, using fallback");
    return generateFallbackSummary(holdings, totals, allocation);
  }
}

function generateFallbackSummary(
  holdings: PortfolioHoldingResult[],
  totals: PortfolioTotals,
  allocation: PortfolioAllocation
): string {
  const valid = holdings.filter((h) => !h.error);
  const uptrend = valid.filter((h) => h.trendDirection === "uptrend").length;
  const downtrend = valid.filter((h) => h.trendDirection === "downtrend").length;
  const topSector = allocation.bySector[0];
  const concentrated = topSector && topSector.weight > 0.5;

  return (
    `This portfolio contains ${valid.length} holding${valid.length !== 1 ? "s" : ""} with a total value of $${totals.totalValue.toLocaleString()}` +
    (totals.totalGainLossPct != null
      ? ` and an overall return of ${totals.totalGainLossPct >= 0 ? "+" : ""}${totals.totalGainLossPct.toFixed(2)}%.`
      : ".") +
    ` ${uptrend} position${uptrend !== 1 ? "s are" : " is"} in an uptrend and ${downtrend} in a downtrend based on moving average analysis.` +
    (totals.weightedBeta != null
      ? ` The weighted portfolio beta is ${totals.weightedBeta.toFixed(2)}, indicating ${totals.weightedBeta > 1.2 ? "above-average" : totals.weightedBeta < 0.8 ? "below-average" : "moderate"} market sensitivity.`
      : "") +
    `\n\nSector allocation is led by ${allocation.bySector.map((s) => `${s.sector} (${(s.weight * 100).toFixed(1)}%)`).join(", ")}.` +
    (concentrated
      ? ` The heavy concentration in ${topSector.sector} (${(topSector.weight * 100).toFixed(1)}%) represents a meaningful sector-specific risk — broader diversification may reduce drawdown exposure.`
      : " The portfolio shows reasonable sector distribution.") +
    (totals.weightedPE != null
      ? ` The weighted average P/E of ${totals.weightedPE.toFixed(1)} reflects the portfolio's overall valuation profile.`
      : "") +
    `\n\nThis is a summary based on publicly available market data. It does not constitute financial advice. Always conduct thorough due diligence before making investment decisions.`
  );
}
