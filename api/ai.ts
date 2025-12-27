// api/ai.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

      const vibeInstructions = {
        romantic: "Write in a romantic, intimate tone. Emphasize cozy moments and special experiences.",
        family: "Write in a fun, family-friendly tone. Include tips for kids and group activities.",
        adventurous: "Write in an adventurous, excited tone. Focus on unique experiences and hidden gems.",
        popular: "Write in an engaging, informative tone. Highlight why these are must-visit spots."
      };

      const vibeGuide = vibeInstructions[vibe as keyof typeof vibeInstructions] || vibeInstructions.popular;

      const prompt = `You are a travel planner writing a day plan note for Day ${day} in ${city}.
${vibeGuide}
Based on these selections: ${summary}
Write a short, engaging day-plan note that ties the activities together and creates excitement for the day. Keep it 3-5 sentences. Be specific and reference the places/activities selected.`;

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
            temperature: 0.9,
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
