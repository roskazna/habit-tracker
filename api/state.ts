import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorize } from "./_auth";
import { ensureStateTable, getPool } from "./_db";

const STATE_ID = "personal";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) {
    return;
  }

  if (!["GET", "PUT"].includes(req.method ?? "")) {
    res.setHeader("Allow", "GET, PUT");
    res.status(405).send("Метод не поддерживается.");
    return;
  }

  try {
    await ensureStateTable();

    if (req.method === "GET") {
      const pool = await getPool();
      const result = await pool.query(
        "select payload, updated_at from habit_tracker_state where id = $1",
        [STATE_ID]
      );

      if (!result.rowCount) {
        res.status(404).send("Состояние еще не сохранено на сервере.");
        return;
      }

      res.status(200).json({
        state: result.rows[0].payload,
        updatedAt: result.rows[0].updated_at
      });
      return;
    }

    const state = req.body?.state;

    if (!state || typeof state !== "object") {
      res.status(400).send("Ожидался JSON вида { state }.");
      return;
    }

    const now = new Date().toISOString();
    const nextState = {
      ...state,
      updatedAt: now
    };

    const pool = await getPool();
    const result = await pool.query(
      `
        insert into habit_tracker_state (id, payload, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (id)
        do update set payload = excluded.payload, updated_at = now()
        returning payload, updated_at
      `,
      [STATE_ID, JSON.stringify(nextState)]
    );

    res.status(200).json({
      state: result.rows[0].payload,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";
    console.error("habit-tracker state api error:", error);
    res.status(500).send(message);
  }
}
