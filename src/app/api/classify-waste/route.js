import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const POINT_MAP = {
  battery: 15,
  phone: 25,
  laptop: 50,
  cable: 10,
  appliance: 35,
  printer: 40,
  tv: 45,
  monitor: 40,
  tablet: 30,
  keyboard: 10,
  mouse: 8,
  camera: 20,
  other: 10,
};

export async function POST(req) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            {
              type: "text",
              text: `You are an e-waste classification assistant. Identify the electronic waste item in this image.

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "category": "<one of: battery, phone, laptop, cable, appliance, printer, tv, monitor, tablet, keyboard, mouse, camera, other>",
  "label": "<short human-readable item name, e.g. 'Smartphone', 'Laptop Battery', 'HDMI Cable'>",
  "confidence": <0.0 to 1.0>,
  "description": "<one sentence describing the item and why it qualifies as e-waste>"
}

If the image does not contain e-waste, set category to "other" and confidence below 0.4.`,
            },
          ],
        },
      ],
    });

    const raw = message.content[0]?.text?.trim() ?? "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Classification failed. Try a clearer image." }, { status: 422 });
    }

    const category = (parsed.category ?? "other").toLowerCase();
    const suggestedPoints = POINT_MAP[category] ?? POINT_MAP.other;

    return NextResponse.json({
      category,
      label: parsed.label ?? category,
      confidence: parsed.confidence ?? 0.5,
      description: parsed.description ?? "",
      suggestedPoints,
    });
  } catch (err) {
    console.error("classify-waste error:", err);
    return NextResponse.json({ error: "Classification service unavailable." }, { status: 500 });
  }
}
