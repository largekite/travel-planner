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
        romantic: "Write in a romantic, intimate tone. Emphasize cozy moments, special experiences for couples, and intimate settings. Prioritize romantic restaurants, sunset spots, wine bars, and peaceful experiences.",
        family: "Write in a fun, family-friendly tone. Focus on kid-friendly attractions, interactive experiences, and group-friendly activities. Highlight parks, museums with hands-on exhibits, and restaurants where children are welcome. Include practical tips for keeping kids engaged.",
        adventurous: "Write in an adventurous, energetic tone. Emphasize outdoor activities, physical experiences, and off-the-beaten-path discoveries. Prioritize hiking, water sports, adventure tours, and unique local experiences. Focus on active exploration and authentic encounters.",
        popular: "Write in an engaging, informative tone. Highlight iconic landmarks, famous restaurants, must-see attractions, and highly-rated experiences. Explain why these are essential visits and what makes them special. Focus on can't-miss experiences and cultural significance."
      };

      const vibeGuide = vibeInstructions[vibe as keyof typeof vibeInstructions] || vibeInstructions.popular;

      const prompt = `You are a travel planner writing a very concise day-plan note for Day ${day} in ${city}.
    ${vibeGuide}
    Based on these selections: ${summary}
    Write a short 1-2 sentence summary (one short sentence preferred) that highlights the day's plan and key places. Use plain, direct language, reference the selected spots briefly, and avoid lists, headers, or extra commentary. Keep it under ~35 words.`;

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
            temperature: 0.6,
            max_tokens: 120
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
