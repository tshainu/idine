import app from "./api";
import { randomBytes } from "crypto";

const port = Number(process.env.PORT ?? 3000);
const distDir = `${import.meta.dir}/../dist`;
const indexPath = `${distDir}/index.html`;
const uploadsDir = `${distDir}/uploads`;

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    // ── File upload endpoint ──────────────────────────────────────────────
    if (url.pathname === "/api/upload" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
        if (!allowed.includes(ext)) return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
        const bytes = await file.arrayBuffer();
        await Bun.write(`${uploadsDir}/${name}`, bytes);
        return new Response(JSON.stringify({ url: `/uploads/${name}` }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (url.pathname.startsWith("/api")) {
      return app.fetch(request);
    }

    const filePath = getStaticFilePath(url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    const index = Bun.file(indexPath);
    if (await index.exists()) {
      return new Response(index, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Build output not found. Run `bun run build` first.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Web server listening on http://localhost:${server.port}`);

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");

  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}
