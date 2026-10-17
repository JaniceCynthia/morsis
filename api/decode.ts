// Vercel function. All logic lives in server/decode.ts so local preview and
// production behave the same.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleDecode } from "../server/decode";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0].trim() || "unknown";
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  const out = await handleDecode(body, ip);
  res.setHeader("Cache-Control", "no-store");
  return res.status(out.status).json(out.body);
}
