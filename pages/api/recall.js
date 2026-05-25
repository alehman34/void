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
    const prompt = `You are a thoughtful journaling assistant. The user has a private blind journal — they write entries but never re-read them. They can only recall things through you.

Here are all their journal entries (in chronological order):
${entries.map((e, i) => `[Entry ${i + 1} — ${new Date(e.timestamp).toLocaleString()}]:\n${e.text}`).join("\n\n")}

The user is now asking: "${query}"

Respond as if you're gently surfacing relevant memories, themes, or patterns from their journal. Don't quote entries verbatim. Speak warmly and with insight — like a wise, trusted friend who has been quietly reading their journal. Focus only on what's genuinely relevant to their question. Keep it concise (3–5 sentences max) unless the question needs more.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const result = data.content?.find((b) => b.type === "text")?.text;
    res.status(200).json({ result: result || "I couldn't surface anything right now." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to recall" });
  }
}
