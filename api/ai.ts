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

type TrackerState = {
  habits?: Array<{
    id: string;
    title: string;
    category?: string;
    enabled?: boolean;
  }>;
  habitLogs?: Record<string, Record<string, boolean>>;
  bloodPressureLogs?: Array<{
    date: string;
    time: string;
    systolic: number;
    diastolic: number;
    pulse?: number;
  }>;
  dailyStepsLogs?: Array<{
    date: string;
    steps: number;
    note?: string;
  }>;
  tasks?: Array<{
    title: string;
    category?: string;
    priority?: string;
    dueDate?: string;
    repeat?: string;
    completed?: boolean;
    notes?: string;
  }>;
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
  "Ты AI-коуч продуктивности. Русский язык. Мужчина 45 лет, сидячий образ жизни. Не ставь диагнозы, не назначай лечение и не меняй лекарства. Верни только JSON. Summary до 120 символов. Ровно 3 рекомендации. В каждом поле title/reason/action до 110 символов.";

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const recentDateKeys = (days: number) => {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - index);
    keys.push(toDateKey(date));
  }

  return keys;
};

const compactStateForAi = (state: TrackerState) => {
  const keys = recentDateKeys(14);
  const habits = (state.habits ?? [])
    .filter((habit) => habit.enabled !== false)
    .map((habit) => ({
      id: habit.id,
      title: habit.title,
      category: habit.category
    }));

  const habitLogs = Object.fromEntries(
    keys.map((key) => [key, state.habitLogs?.[key] ?? {}])
  );

  const tasks = (state.tasks ?? [])
    .filter((task) => !task.completed)
    .slice(0, 12)
    .map((task) => ({
      title: task.title,
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate,
      repeat: task.repeat,
      notes: task.notes ? task.notes.slice(0, 140) : ""
    }));

  return {
    today: toDateKey(new Date()),
    habits,
    habitLogs,
    bloodPressure: (state.bloodPressureLogs ?? []).slice(-20),
    dailySteps: (state.dailyStepsLogs ?? []).slice(-30),
    activeTasks: tasks
  };
};

const fallbackInsight = (state: TrackerState) => {
  const compact = compactStateForAi(state);
  const todayLog = compact.habitLogs[compact.today] ?? {};
  const completedToday = compact.habits.filter((habit) => todayLog[habit.id]).length;
  const total = compact.habits.length;
  const percent = total ? Math.round((completedToday / total) * 100) : 0;
  const highTasks = compact.activeTasks.filter((task) => task.priority === "high").length;

  return {
    summary: `AI ответ был обрезан. Локальная оценка: привычки сегодня ${percent}%, активных задач ${compact.activeTasks.length}.`,
    recommendations: [
      {
        title: "Сузить фокус дня",
        reason: `Сегодня выполнено ${completedToday} из ${total} привычек.`,
        action: "Выберите 3 обязательных действия: вода, движение и один рабочий результат.",
        priority: "сегодня" as const
      },
      {
        title: "Разгрузить высокий приоритет",
        reason: `Активных задач с высоким приоритетом: ${highTasks}.`,
        action: "Оставьте главным один рабочий пункт, остальное перенесите или понизьте.",
        priority: "сегодня" as const
      },
      {
        title: "Поддержать тело после сидения",
        reason: "Сидячий день требует коротких регулярных компенсаций.",
        action: "Сделайте 10 минут ходьбы или мягкую связку приседаний без отказа.",
        priority: "на неделе" as const
      }
    ],
    focusHabitIds: compact.habits.slice(0, 3).map((habit) => habit.id)
  };
};

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
    const state = req.body?.state as TrackerState | undefined;

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
                  compact: compactStateForAi(state)
                })}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseJsonSchema: recommendationSchema
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
      parsed = fallbackInsight(state);
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
