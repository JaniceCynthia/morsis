import { defineConfig, loadEnv, type Plugin, type Connect } from "vite";
import { resolve } from "node:path";
import { handleDecode } from "./server/decode";

// Mounts the Decode-3 proxy at /api/decode for `vite` and `vite preview`, so
// the laptop can run the whole demo without Vercel.
function decodeApi(): Plugin {
  const mw: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url !== "/api/decode") return next();
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end();
    }
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      let body: unknown = null;
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        /* handled as bad request below */
      }
      const out = await handleDecode(body, req.socket.remoteAddress || "local");
      res.statusCode = out.status;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(out.body));
    });
  };
  return {
    name: "morsis-decode-api",
    configureServer: (s) => void s.middlewares.use(mw),
    configurePreviewServer: (s) => void s.middlewares.use(mw),
  };
}

export default defineConfig(({ mode }) => {
  // Expose .env.local server-side only (no VITE_ prefix, never bundled).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [decodeApi()],
    build: {
      rollupOptions: {
        input: { main: resolve(__dirname, "index.html") },
      },
    },
  };
});
