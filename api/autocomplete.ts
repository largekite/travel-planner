import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleKey) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY is not set" });
  }

  const input = (req.query.input as string) || "";
  if (input.length < 2) {
    return res.status(200).json({ predictions: [] });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("types", "(cities)");
    url.searchParams.set("key", googleKey);

    const response = await fetch(url.toString());
    const data = await response.json();
    
    return res.status(200).json({
      predictions: data.predictions?.slice(0, 5).map((p: any) => p.description) || []
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "autocomplete failed" });
  }
}