import { Pool } from "pg";

let pool: Pool | undefined;

export const getPool = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL не настроен.");
  }

  if (!pool) {
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
  await getPool().query(`
    create table if not exists habit_tracker_state (
      id text primary key,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
};
