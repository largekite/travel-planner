// api/ai.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // health
  if (req.method === "GET" && req.query.health) {
    return res.status(200).json({ ok: true });
  }

  const openaiKey = process.env.OPENAI_API_KEY;

  // directions GET ?withDirections=true...
  if (req.method === "GET" && req.query.withDirections === "true") {
    // For now we just return an empty directions array; UI will fall back to straight lines.
    // Later you can plug in Google Directions API here.
    return res.status(200).json({ directions: [] });
  }

  // day-notes creation (UI sends POST)
  if (req.method === "POST") {
    const body = req.body || {};
    const mode = body.mode;
    if (mode === "day-notes") {
      if (!openaiKey) {
        return res.status(200).json({
          notes: "Notes unavailable (no OPENAI_API_KEY set).",
        });
      }
      const city = body.city;
      const vibe = body.vibe;
      const day = body.day;
      const selections = body.selections || {};

      const summary = Object.entries(selections)
        .filter(([, v]) => v && (v as any).name)
        .map(([k, v]) => `${k}: ${(v as any).name}`)
        .join(", ");

      const prompt = `You are a travel planner. Write a short, friendly day-plan note for Day ${day} in ${city} for a "${vibe}" vibe. Mention these picks: ${summary}. Keep it 3-5 sentences.`;

      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
        }).then((r) => r.json());

        const text = aiRes.choices?.[0]?.message?.content?.trim() || "";
        return res.status(200).json({ notes: text });
      } catch (e: any) {
        return res.status(500).json({ error: e?.message || "ai error" });
      }
    }
  }

  return res.status(400).json({ error: "Unsupported request" });
}
