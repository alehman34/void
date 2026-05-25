import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { readEntries } from "../../lib/drive";

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not signed in" });
  if (session.error === "RefreshAccessTokenError") return res.status(401).json({ error: "Session expired" });
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "No query" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const entries = await readEntries(session.accessToken);
    if (!entries.length) {
      res.write(`data: ${JSON.stringify({ text: "You haven't written anything yet." })}\n\n`);
      res.end();
      return;
    }

    const prompt = `You are a helpful assistant. The user keeps a personal journal and wants to look something up from it.

Here are their journal entries (in chronological order):
${entries.map((e, i) => `[Entry ${i + 1} — ${new Date(e.timestamp).toLocaleString()}]:\n${e.text}`).join("\n\n")}

The user is asking: "${query}"

Answer based on what's in their entries. Be direct and concise. Don't quote entries verbatim. 3-4 sentences max.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch {}
      }
    }

    res.end();
  } catch (err) {
    console.error("Recall error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to recall" });
    else {
      res.write(`data: ${JSON.stringify({ text: "Something went wrong." })}\n\n`);
      res.end();
    }
  }
}
