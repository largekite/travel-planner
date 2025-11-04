// /api/enrich.ts
import type { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { placeName, vibe = "romantic", city = "", rawAddress = "", mealType = "" } = body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ detail: "OPENAI_API_KEY missing", desc: "" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const prompt = `Write 2 short sentences for a ${vibe} trip about "${placeName}" in ${city}. Mention what to order or what to look for. Keep it friendly.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // use a fast/light model
      messages: [
        { role: "system", content: "You return short, travel-friendly descriptions." },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.7,
    }),
  });

  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content ?? "";

  return new Response(JSON.stringify({ desc: text }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
