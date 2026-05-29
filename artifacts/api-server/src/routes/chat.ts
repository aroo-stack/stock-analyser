import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  ticker: string;
  messages: ConvMessage[];
  createdAt: number;
}

const conversations = new Map<string, Conversation>();

const CONV_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function pruneOldConversations() {
  const cutoff = Date.now() - CONV_MAX_AGE_MS;
  for (const [id, conv] of conversations.entries()) {
    if (conv.createdAt < cutoff) conversations.delete(id);
  }
}

// POST /chat/start
router.post("/chat/start", async (req, res): Promise<void> => {
  const { ticker } = req.body as { ticker?: string };
  if (!ticker || typeof ticker !== "string") {
    res.status(400).json({ error: "ticker is required" });
    return;
  }
  pruneOldConversations();
  const conversationId = `${ticker.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  conversations.set(conversationId, {
    ticker: ticker.toUpperCase(),
    messages: [],
    createdAt: Date.now(),
  });
  logger.info({ ticker, conversationId }, "Chat conversation started");
  res.json({ conversationId });
});

// POST /chat/message
router.post("/chat/message", async (req, res): Promise<void> => {
  const { conversationId, message, ticker, analysisContext, teachMeMode } = req.body as {
    conversationId?: string;
    message?: string;
    ticker?: string;
    analysisContext?: string;
    teachMeMode?: boolean;
  };

  if (!conversationId || !message || !ticker) {
    res.status(400).json({ error: "conversationId, message, and ticker are required" });
    return;
  }

  const conv = conversations.get(conversationId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found or expired. Please start a new chat." });
    return;
  }

  conv.messages.push({ role: "user", content: message });

  const baseContext = analysisContext
    ? `Here is the current analysis context for ${ticker}: ${analysisContext}`
    : `The user is asking about the stock ticker ${ticker}.`;

  const systemPrompt = teachMeMode
    ? `You are a friendly stock analysis assistant in Teach Me mode. ${baseContext} Explain concepts slowly and simply, using analogies a beginner would understand. Keep your answers short (2-4 sentences). Always end with a reminder that you are not a financial advisor.`
    : `You are a helpful stock analysis assistant. ${baseContext} Answer clearly and concisely in plain English (2-4 sentences). Always remind the user you are not a financial advisor.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        ...conv.messages,
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim() ?? "I couldn't generate a response right now.";
    conv.messages.push({ role: "assistant", content: reply });
    logger.info({ ticker, conversationId }, "Chat reply generated");
    res.json({ reply, conversationId });
  } catch (err) {
    logger.error({ err, ticker }, "Chat message failed");
    res.status(500).json({ error: "Failed to generate reply" });
  }
});

export default router;
