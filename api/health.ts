import type { VercelRequest, VercelResponse } from "@vercel/node";

type QueryResult = {
  rowCount: number | null;
  rows: Array<Record<string, unknown>>;
};

type QueryablePool = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  end: () => Promise<void>;
};

type PoolConstructor = new (config: {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
}) => QueryablePool;

const authorize = (req: VercelRequest, res: VercelResponse) => {
  const expected = process.env.APP_ACCESS_KEY;

  if (!expected) {
    res.status(500).json({ ok: false, error: "APP_ACCESS_KEY не настроен." });
    return false;
  }

  const incoming = req.headers["x-tracker-key"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;

  if (value === expected) {
    return true;
  }

  res.status(401).json({ ok: false, error: "Неверный личный ключ доступа." });
  return false;
};

const loadPoolConstructor = async (): Promise<PoolConstructor> => {
  const pgModule = (await import("pg")) as unknown as {
    Pool?: PoolConstructor;
    default?: {
      Pool?: PoolConstructor;
    };
  };

  const Pool = pgModule.Pool ?? pgModule.default?.Pool;

  if (!Pool) {
    throw new Error("Не удалось загрузить PostgreSQL клиент pg.");
  }

  return Pool;
};

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
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL не настроен.");
    }

    const Pool = await loadPoolConstructor();
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined
    });

    await pool.query(`
      create table if not exists habit_tracker_state (
        id text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
    await pool.query("select 1");
    await pool.end();

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
