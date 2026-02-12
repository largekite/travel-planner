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

      // Build detailed context about each selection
      const placeDetails = Object.entries(selections)
        .filter(([, v]) => v && (v as any).name)
        .map(([slot, v]) => {
          const place = v as any;
          const parts = [
            `${slot}: ${place.name}`,
            place.rating ? `(${place.rating}★)` : '',
            place.types?.[0] ? `[${place.types[0].replace(/_/g, ' ')}]` : '',
            place.vicinity || place.formatted_address ? `in ${place.vicinity || place.formatted_address}` : ''
          ];
          return parts.filter(Boolean).join(' ');
        });

      const summary = placeDetails.join(' → ');

      const vibeInstructions = {
        romantic: "Craft a romantic, intimate narrative. Highlight cozy ambiance, special moments for couples, and why each spot creates a memorable romantic experience. Mention specific features like sunset views, candlelit settings, or intimate atmospheres.",
        family: "Create an exciting, family-friendly story. Emphasize what makes each place fun for kids and parents alike. Mention hands-on activities, kid-friendly menus, or interactive elements. Make it sound like an adventure the whole family will love.",
        adventurous: "Write with energy and excitement. Focus on the unique, active experiences at each location. Highlight outdoor elements, physical activities, or off-the-beaten-path discoveries. Make it feel like a thrilling day of exploration.",
        popular: "Craft an informative, enthusiastic narrative. Explain what makes these iconic spots must-visit destinations. Reference their fame, cultural significance, or what travelers consistently rave about. Make readers understand why these are can't-miss experiences."
      };

      const vibeGuide = vibeInstructions[vibe as keyof typeof vibeInstructions] || vibeInstructions.popular;

      const prompt = `You are a creative travel writer crafting a compelling day summary for Day ${day} in ${city}.

VIBE: ${vibe.toUpperCase()}
${vibeGuide}

YOUR ITINERARY:
${summary}

Write ONE vivid sentence (25-40 words) that weaves these places into a cohesive story. Mention 2-3 specific place names naturally. Focus on the EXPERIENCE and ATMOSPHERE, not just listing locations. Make readers excited about this day.

Examples of good style:
- "Start with croissants at the charming Café de Flore, then climb the Eiffel Tower for breathtaking city views before savoring haute cuisine at Le Jules Verne."
- "Adventure awaits at Zion National Park's Angel's Landing trail, followed by craft beers and wood-fired pizza at Zion Brewery to celebrate your summit."

Write your sentence now (no preamble, just the sentence):`;

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
            temperature: 0.8,
            max_tokens: 80
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
