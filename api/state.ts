import type { VercelRequest, VercelResponse } from "@vercel/node";

const STATE_ID = "personal";

type QueryResult = {
  rowCount: number | null;
  rows: Array<Record<string, unknown>>;
};

type QueryablePool = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

type PoolConstructor = new (config: {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
}) => QueryablePool;

let pool: QueryablePool | undefined;

const authorize = (req: VercelRequest, res: VercelResponse) => {
  const expected = process.env.APP_ACCESS_KEY;

  if (!expected) {
    res.status(500).send("APP_ACCESS_KEY не настроен на сервере.");
    return false;
  }

  const incoming = req.headers["x-tracker-key"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;

  if (value === expected) {
    return true;
  }

  res.status(401).send("Неверный личный ключ доступа.");
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

const getPool = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL не настроен.");
  }

  if (!pool) {
    const Pool = await loadPoolConstructor();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined
    });
  }

  return pool;
};

const ensureStateTable = async () => {
  const pool = await getPool();

  await pool.query(`
    create table if not exists habit_tracker_state (
      id text primary key,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
};

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
