import { Router, type IRouter } from "express";
import { buildPortfolioData } from "../lib/portfolioData";
import { generatePortfolioAISummary } from "../lib/portfolioAI";

const router: IRouter = Router();

// POST /portfolio/analyse
router.post("/portfolio/analyse", async (req, res): Promise<void> => {
  const body = req.body as { holdings?: unknown };

  if (!body?.holdings || !Array.isArray(body.holdings) || body.holdings.length === 0) {
    res.status(400).json({ error: "Request body must include a non-empty 'holdings' array" });
    return;
  }

  if (body.holdings.length > 20) {
    res.status(400).json({ error: "Maximum 20 holdings per request" });
    return;
  }

  // Validate each holding
  const inputs: { ticker: string; shares: number | null; costBasis: number | null }[] = [];
  for (const h of body.holdings) {
    if (typeof h !== "object" || h === null || typeof (h as Record<string, unknown>).ticker !== "string") {
      res.status(400).json({ error: "Each holding must have a 'ticker' string field" });
      return;
    }
    const item = h as Record<string, unknown>;
    inputs.push({
      ticker: (item.ticker as string).trim().toUpperCase(),
      shares: typeof item.shares === "number" ? item.shares : null,
      costBasis: typeof item.costBasis === "number" ? item.costBasis : null,
    });
  }

  try {
    req.log.info({ count: inputs.length }, "Analysing portfolio");

    const portfolioData = await buildPortfolioData(inputs);
    const aiSummary = await generatePortfolioAISummary(
      portfolioData.holdings,
      portfolioData.totals,
      portfolioData.allocation
    );

    res.json({
      ...portfolioData,
      aiSummary,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err: msg }, "Portfolio analysis failed");
    res.status(500).json({ error: "Portfolio analysis failed" });
  }
});

export default router;
