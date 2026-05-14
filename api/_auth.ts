import type { VercelRequest, VercelResponse } from "@vercel/node";

export const authorize = (req: VercelRequest, res: VercelResponse) => {
  const expected = process.env.APP_ACCESS_KEY;

  if (!expected && process.env.NODE_ENV !== "production") {
    return true;
  }

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
