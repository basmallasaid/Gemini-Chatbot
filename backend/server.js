// =========================================================
// EcoStore Chatbot — Express backend
// ---------------------------------------------------------
// POST /chat  { message: string, history?: [{ role, text }] }
//          -> { reply: string }
// The Gemini API key stays here on the server (backend/.env)
// and is never sent to the browser.
// =========================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const PORT = process.env.PORT || 3001;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
// Tried in order if the main model is overloaded (503) or rate-limited (429)
const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-2.5-flash"].filter((m) => m !== MODEL);
const RETRYABLE = new Set([429, 500, 503]);
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 10; // previous turns sent to Gemini for context

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing. Add it to backend/.env (see .env.example).");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ---------- AI behaviour ----------
const SYSTEM_INSTRUCTION = `
You are "Eco", the friendly shopping assistant for EcoStore, an eco-friendly online store.

What EcoStore sells:
- Reusable shopping bags (e.g. Reusable Cotton Tote Bag, mesh produce bags)
- Reusable water bottles (e.g. Stainless Steel Water Bottle)
- Sustainable home products (e.g. Bamboo Kitchen Set, Eco-Friendly Storage Containers)
EcoStore's mission: making sustainable living simple, practical, and accessible.

Rules:
1. Only answer questions related to EcoStore: its products, product materials and care,
   choosing the right product, sustainability tips connected to these products, and the store's mission.
2. If a question is unrelated to EcoStore, politely refuse in one short sentence and
   suggest something you can help with.
3. Always reply in the same language the visitor used (Arabic → Arabic, English → English).
4. Be friendly, warm and concise — usually 1–3 short sentences or a short list.
5. NEVER invent prices, discounts, stock availability, delivery times or shipping details.
   If asked, say you don't have that information and suggest checking the product page
   or contacting the EcoStore team.
6. Do not make up products the store does not list. Use plain text, no markdown headings.
`.trim();

// ---------- App ----------
const app = express();
app.use(cors()); // allow the landing page (Live Server, any local port) to call the API
app.use(express.json({ limit: "20kb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "EcoStore chatbot", model: MODEL });
});

// Turn the client-side history into Gemini "contents"
function buildContents(history, message) {
  const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  const contents = safeHistory
    .filter((m) => m && typeof m.text === "string" && m.text.trim() && (m.role === "user" || m.role === "model"))
    .map((m) => ({ role: m.role, parts: [{ text: m.text.slice(0, MAX_MESSAGE_LENGTH) }] }));

  contents.push({ role: "user", parts: [{ text: message }] });
  return contents;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ask Gemini. On temporary errors (busy / rate limit), retry once,
// then fall back to the next Flash model.
async function generateReply(contents) {
  const models = [MODEL, ...FALLBACK_MODELS];
  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.5,
            maxOutputTokens: 400,
          },
        });
        return response.text?.trim();
      } catch (err) {
        lastError = err;
        if (!RETRYABLE.has(err?.status)) throw err; // e.g. bad key → stop now
        console.warn(`⚠️  ${model} returned ${err.status} (attempt ${attempt}), retrying…`);
        if (attempt === 1) await sleep(800);
      }
    }
  }
  throw lastError;
}

app.post("/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  // ---- Validation ----
  if (!message) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` });
  }

  // ---- Ask Gemini ----
  try {
    const reply = await generateReply(buildContents(req.body.history, message));
    if (!reply) {
      return res.status(502).json({ error: "The assistant returned an empty response. Please try again." });
    }

    res.json({ reply });
  } catch (err) {
    // Log details on the server only — never leak them to the client
    console.error("Gemini API error:", err?.status || "", err?.message || err);

    const status = err?.status;
    if (status === 429 || status === 503) {
      return res.status(429).json({ error: "The assistant is busy right now. Please try again in a moment." });
    }
    if (status === 400 || status === 401 || status === 403) {
      return res.status(500).json({ error: "The assistant is not configured correctly. Please try again later." });
    }
    res.status(502).json({ error: "Sorry, the assistant is unavailable right now. Please try again." });
  }
});

// Malformed JSON bodies and other unexpected errors
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`✅ EcoStore chatbot backend running at http://localhost:${PORT} (model: ${MODEL})`);
});
