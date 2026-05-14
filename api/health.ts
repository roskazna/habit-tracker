import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorize } from "./_auth";
import { ensureStateTable, getPool } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Метод не поддерживается." });
    return;
  }

  const checks = {
    appAccessKey: Boolean(process.env.APP_ACCESS_KEY),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    openAiKey: Boolean(process.env.OPENAI_API_KEY),
    openAiModel: process.env.OPENAI_MODEL || "gpt-5.5"
  };

  try {
    await ensureStateTable();
    const pool = await getPool();
    await pool.query("select 1");

    res.status(200).json({
      ok: true,
      checks
    });
  } catch (error) {
    console.error("habit-tracker health api error:", error);
    res.status(500).json({
      ok: false,
      checks,
      error: error instanceof Error ? error.message : "Неизвестная ошибка."
    });
  }
}
