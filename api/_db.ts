import type { Pool as PgPool, PoolConfig } from "pg";

type PoolConstructor = new (config: PoolConfig) => PgPool;

let pool: PgPool | undefined;

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

export const getPool = async () => {
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

export const ensureStateTable = async () => {
  const pool = await getPool();

  await pool.query(`
    create table if not exists habit_tracker_state (
      id text primary key,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
};
