import { Hono } from "hono";

// Extracts item name + price pairs from an uploaded menu card image using a vision-capable LLM.
export const menuExtract = new Hono()
  .post("/", async (c) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ error: "OPENAI_API_KEY is not configured on the server. Ask the admin to set it." }, 500);
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
                  text: "Extract every menu item and its price from this menu card image. Respond ONLY with a JSON array like [{\"name\":\"Chicken Curry\",\"price\":950}]. Use numeric prices without currency symbols. Skip section headers.",
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
        .filter((i: any) => i && i.name && !isNaN(Number(i.price)))
        .map((i: any) => ({ name: String(i.name).trim(), price: Number(i.price) }));

      return c.json({ items: clean }, 200);
    } catch (e: any) {
      return c.json({ error: e.message || "Extraction failed" }, 500);
    }
  });
