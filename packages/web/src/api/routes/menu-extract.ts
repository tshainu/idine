import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";

// Extracts item name + price pairs from an uploaded menu card image using a vision-capable LLM.
export const menuExtract = new Hono()
  .post("/", async (c) => {
    const branchId = c.req.query("branchId");
    let apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey && branchId) {
      const [row] = await db.select().from(schema.branchSettings).where(
        and(eq(schema.branchSettings.branchId, parseInt(branchId)), eq(schema.branchSettings.key, "openaiApiKey")),
      );
      if (row?.value) apiKey = row.value;
    }
    if (!apiKey) {
      return c.json({ error: "OpenAI API key is not configured. Add it under Settings → Integrations." }, 500);
    }

    const body = await c.req.formData();
    const file = body.get("file") as File | null;
    if (!file) return c.json({ error: "No image uploaded" }, 400);

    const buf = await file.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const mime = file.type || "image/jpeg";

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract every menu item from this menu card image, including its section heading (category) and price(s).

Rules:
- "category" = the section heading the item appears under (e.g. "Starters", "Rice & Noodles", "Beverages"). If no heading is visible, use "Uncategorized".
- If a line has only ONE price, return it as {"category":"...","name":"...","price":123}.
- If a line has TWO OR MORE prices (e.g. separate columns for Small/Large, Half/Full, Regular/Large), read the column header text above those prices and return them as variations: {"category":"...","name":"...","variations":[{"name":"Half","price":450},{"name":"Full","price":850}]}. Use the actual column header words as the variation names (e.g. "Small"/"Large", "Half"/"Full") — if no header text is visible, use "Regular" and "Large".
- Use numeric prices without currency symbols.
- Skip section headers themselves (don't return them as items).

Respond ONLY with a JSON object: {"items": [...]} using the shapes above.`,
                },
                { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return c.json({ error: `AI request failed: ${errText}` }, 500);
      }

      const data = await res.json() as any;
      const content = data?.choices?.[0]?.message?.content || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return c.json({ error: "Could not parse AI response" }, 500);
      }
      const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.menu || []);
      const clean = items
        .filter((i: any) => i && i.name && (Array.isArray(i.variations) ? i.variations.length > 0 : !isNaN(Number(i.price))))
        .map((i: any) => {
          const category = String(i.category || "Uncategorized").trim();
          if (Array.isArray(i.variations) && i.variations.length > 0) {
            return {
              name: String(i.name).trim(),
              category,
              variations: i.variations
                .filter((v: any) => v && v.name && !isNaN(Number(v.price)))
                .map((v: any) => ({ name: String(v.name).trim(), price: Number(v.price) })),
            };
          }
          return { name: String(i.name).trim(), category, price: Number(i.price) };
        });

      return c.json({ items: clean }, 200);
    } catch (e: any) {
      return c.json({ error: e.message || "Extraction failed" }, 500);
    }
  });
