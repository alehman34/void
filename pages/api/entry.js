import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { readEntries, writeEntries } from "../../lib/drive";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not signed in" });
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "No text" });
  try {
    const entries = await readEntries(session.accessToken);
    entries.push({
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });
    await writeEntries(session.accessToken, entries);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save" });
  }
}
