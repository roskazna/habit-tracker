import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { authorize } from "./_auth";

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Метод не поддерживается.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).send("OPENAI_API_KEY не настроен.");
    return;
  }

  try {
    const state = req.body?.state;

    if (!state || typeof state !== "object") {
      res.status(400).send("Ожидался JSON вида { state }.");
      return;
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      reasoning: {
        effort: "low"
      },
      instructions:
        "Ты персональный AI-коуч продуктивности для русскоязычного мужчины 45 лет с сидячим образом жизни. Учитывай привычки, задачи, пропуски и контекст здоровья, но не ставь диагнозы, не назначай лечение и не меняй лекарства. Давай конкретные, осторожные, выполнимые рекомендации на русском языке.",
      input: JSON.stringify({
        today: new Date().toISOString().slice(0, 10),
        state
      }),
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "productivity_recommendations",
          strict: true,
          schema: recommendationSchema
        }
      }
    });

    const text = response.output_text;
    const parsed = JSON.parse(text) as {
      summary: string;
      recommendations: Array<{
        title: string;
        reason: string;
        action: string;
        priority: "сегодня" | "на неделе" | "наблюдать";
      }>;
      focusHabitIds: string[];
    };

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
