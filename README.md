# Трекер привычек

Личный React-дашборд продуктивности на русском языке: привычки, задачи, графики, синхронизация между устройствами и AI-рекомендации через серверный API.

## Что внутри

- React + TypeScript + Vite.
- Темный адаптивный интерфейс для компьютера и телефона.
- Привычки с чекбоксами, редактированием, отключением и сортировкой.
- Задачи с категориями `Дом`, `Работа`, `Личное`, приоритетами, дедлайнами, повторами, заметками и фильтрами.
- Графики прогресса за день, неделю и месяц.
- Синхронизация через PostgreSQL и `/api/state`.
- AI-рекомендации через Gemini и `/api/ai`.
- Доступ без аккаунта через личный ключ `APP_ACCESS_KEY`.

## Локальный запуск

```bash
npm install
npm run dev
```

Для проверки сборки:

```bash
npm run build
```

Для локальной проверки serverless API используйте Vercel CLI:

```bash
npx vercel dev
```

В текущей папке Codex обнаружил `node.exe`, но `npm` не найден в `PATH`. Если команды выше не запускаются, установите Node.js LTS с npm или добавьте npm в `PATH`.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` для локальной разработки или добавьте эти значения в панели хостинга:

```env
APP_ACCESS_KEY=replace-with-long-random-secret
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

`APP_ACCESS_KEY` вводится в блоке синхронизации внутри приложения. Используйте один и тот же ключ на компьютере и телефоне.

## База данных

Подойдет любой hosted PostgreSQL: Neon, Supabase Postgres, Vercel Postgres, Render PostgreSQL. Таблица создается автоматически при первом обращении к `/api/state`:

```sql
create table if not exists habit_tracker_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
```

## Деплой на Vercel

1. Создайте проект на Vercel из этого репозитория/папки.
2. Добавьте переменные `APP_ACCESS_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. После деплоя откройте сайт на компьютере и телефоне, введите личный ключ и нажмите синхронизацию.

## Диагностика Vercel API

Если при синхронизации появляется `FUNCTION_INVOCATION_FAILED`, откройте логи проекта:

1. Vercel Dashboard -> ваш проект -> Deployments.
2. Выберите последний deployment.
3. Откройте Functions или Runtime Logs.
4. Найдите строку `habit-tracker state api error`.

Можно проверить API из PowerShell:

```powershell
$key = "ваш APP_ACCESS_KEY"
Invoke-RestMethod -Uri "https://ваш-домен.vercel.app/api/health" -Headers @{ "x-tracker-key" = $key }
```

Ответ `ok: true` означает, что ключ, БД и таблица доступны. Если `ok: false`, поле `error` покажет причину.

## Безопасность

Gemini API key не используется в браузере. Клиент обращается только к `/api/ai`, а ключ хранится в переменных окружения хостинга.

Приложение не заменяет врача. Привычки сформулированы как мягкие напоминания и должны быть согласованы с личными медицинскими ограничениями.
