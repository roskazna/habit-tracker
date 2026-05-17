import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    apiVersion: "gemini-fallback-2026-05-17",
    message: "API работает",
    time: new Date().toISOString()
  });
}
