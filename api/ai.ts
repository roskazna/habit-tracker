import type { VercelRequest, VercelResponse } from "@vercel/node";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
};

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

const recommendationSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          action: { type: "string" },
          priority: {
            type: "string",
            enum: ["сегодня", "на неделе", "наблюдать"]
          }
        },
        required: ["title", "reason", "action", "priority"]
      }
    },
    focusHabitIds: {
      type: "array",
      items: { type: "string" },
      maxItems: 5
    }
  },
  required: ["summary", "recommendations", "focusHabitIds"]
} as const;

const systemPrompt =
  "Ты персональный AI-коуч продуктивности для русскоязычного мужчины 45 лет с сидячим образом жизни. Учитывай привычки, задачи, пропуски и контекст здоровья, но не ставь диагнозы, не назначай лечение и не меняй лекарства. Давай конкретные, осторожные, выполнимые рекомендации на русском языке. Ответ должен быть только валидным JSON по заданной схеме.";

const parseJsonText = (text: string) => {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutFence) as {
    summary: string;
    recommendations: Array<{
      title: string;
      reason: string;
      action: string;
      priority: "сегодня" | "на неделе" | "наблюдать";
    }>;
    focusHabitIds: string[];
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Метод не поддерживается.");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).send("GEMINI_API_KEY не настроен.");
    return;
  }

  try {
    const state = req.body?.state;

    if (!state || typeof state !== "object") {
      res.status(400).send("Ожидался JSON вида { state }.");
      return;
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nДанные пользователя:\n${JSON.stringify({
                  today: new Date().toISOString().slice(0, 10),
                  state
                })}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2048,
          responseFormat: {
            text: {
              mimeType: "application/json",
              schema: recommendationSchema
            }
          }
        }
      })
    });

    const payload = (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok) {
      throw new Error(
        payload.error?.message || `Gemini API вернул HTTP ${response.status}.`
      );
    }

    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error(
        `Gemini API вернул пустой ответ${
          candidate?.finishReason ? `, причина: ${candidate.finishReason}` : ""
        }.`
      );
    }

    let parsed: ReturnType<typeof parseJsonText>;

    try {
      parsed = parseJsonText(text);
    } catch (parseError) {
      console.error("habit-tracker ai invalid json:", text);
      throw new Error(
        `Gemini вернул невалидный JSON${
          candidate?.finishReason ? `, причина: ${candidate.finishReason}` : ""
        }. Повторите запрос или проверьте модель GEMINI_MODEL.`
      );
    }

    res.status(200).json({
      insight: {
        generatedAt: new Date().toISOString(),
        ...parsed
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка AI.";
    console.error("habit-tracker ai api error:", error);
    res.status(500).send(message);
  }
}
