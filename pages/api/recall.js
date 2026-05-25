import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { readEntries } from "../../lib/drive";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not signed in" });
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "No query" });
  try {
    const entries = await readEntries(session.accessToken);
    if (!entries.length) {
      return res.status(200).json({ result: "You haven't written anything yet." });
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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data));
    const result = data.content?.[0]?.text;
    res.status(200).json({ result: result || "I couldn't surface anything right now." });
  } catch (err) {
    console.error("Recall error:", err);
    res.status(500).json({ error: "Failed to recall" });
  }
}
