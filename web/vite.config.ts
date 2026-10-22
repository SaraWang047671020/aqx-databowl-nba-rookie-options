import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/** 本機開發時把 /api/<name> 轉給 api/<name>.ts（正式環境由 Vercel Functions 處理）。 */
function localApi(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      Object.assign(process.env, loadEnv("development", process.cwd(), ""));
      server.middlewares.use("/api", async (req, res, next) => {
        const name = (req.url ?? "").replace(/^\//, "").split("?")[0];
        if (!/^[a-z]+$/.test(name)) return next();
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const mod = await server.ssrLoadModule(`/api/${name}.ts`);
        const response: Response = await mod.POST(new Request(`http://localhost/api/${name}`, {
          method: req.method, headers: req.headers as HeadersInit,
          body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
        }));
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  build: { chunkSizeWarningLimit: 6000 },
});
