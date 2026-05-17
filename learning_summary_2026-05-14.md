# Конспект за 14 мая 2026: деплой трекера привычек

## Что сегодня сделано

- Сформулированы требования к личному веб-приложению "Трекер привычек".
- Создан React/Vite проект с темным дашбордом, привычками, задачами, графиками и AI-рекомендациями.
- Подготовлена серверная часть на Vercel Functions:
  - `/api/state` для синхронизации данных через PostgreSQL;
  - `/api/ai` для настоящих AI-рекомендаций;
  - `/api/health` для диагностики БД и переменных окружения;
  - `/api/ping` для проверки, что Vercel Functions работают.
- Проект загружен на GitHub.
- Проект развернут на Vercel.
- Создана облачная PostgreSQL БД.
- Настроены переменные окружения `APP_ACCESS_KEY`, `DATABASE_URL` и ключ AI-провайдера.
- Исправлены ошибки деплоя и синхронизации.

## Как теперь устроено приложение

- GitHub хранит код проекта.
- Vercel берет код из GitHub, собирает приложение и размещает сайт.
- Vercel Functions выполняют серверный код из папки `api`.
- PostgreSQL хранит общие данные, чтобы ПК и телефон видели одно состояние.
- AI API вызывается только с сервера, ключ не попадает в браузер.
- `APP_ACCESS_KEY` защищает API без полноценной авторизации через аккаунт.

## Команды, которые использовались

### Переход в папку проекта

```powershell
cd "D:\PROJECTS\трекер"
```

Переходит в рабочую папку проекта. Эту команду нужно выполнять перед командами Git, npm и локальными проверками.

### Инициализация Git

```powershell
git init
```

Создает локальный Git-репозиторий в текущей папке. Если репозиторий уже есть, Git может написать `Reinitialized existing Git repository`.

### Настройка имени автора

```powershell
git config --global user.name "Ваше Имя"
```

Задает имя автора commit для всех локальных репозиториев на компьютере.

### Настройка email автора

```powershell
git config --global user.email "ваш_email@example.com"
```

Задает email автора commit. Лучше использовать email, привязанный к GitHub, или приватный GitHub email.

### Проверка состояния Git

```powershell
git status
```

Показывает, какие файлы изменены, какие добавлены в индекс, и есть ли что коммитить.

### Добавление файлов в commit

```powershell
git add .
```

Добавляет все измененные и новые файлы в будущий commit. Точка означает "все в текущей папке и ниже".

Можно добавлять только отдельные файлы:

```powershell
git add api/health.ts api/ping.ts
```

### Создание commit

```powershell
git commit -m "Initial habit tracker"
```

Создает снимок изменений с коротким описанием. Commit нужен, чтобы GitHub и Vercel увидели новую версию кода.

### Переименование ветки в main

```powershell
git branch -M main
```

Делает основную ветку `main`. Это стандартное имя ветки, с которой обычно деплоит Vercel.

### Подключение GitHub-репозитория

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/habit-tracker.git
```

Связывает локальный проект с удаленным репозиторием GitHub.

Если `origin` уже существует:

```powershell
git remote set-url origin https://github.com/ВАШ_ЛОГИН/habit-tracker.git
```

Эта команда меняет адрес уже существующего remote.

### Проверка remote

```powershell
git remote -v
```

Показывает, куда Git будет отправлять код при `git push`.

### Отправка кода на GitHub

```powershell
git push -u origin main
```

Отправляет ветку `main` на GitHub. Ключ `-u` запоминает связь локальной ветки с удаленной.

После первого раза обычно достаточно:

```powershell
git push
```

### Установка зависимостей

```powershell
npm install
```

Устанавливает зависимости из `package.json` в папку `node_modules`.

### Запуск локального frontend

```powershell
npm run dev
```

Запускает локальный Vite dev server для проверки интерфейса в браузере.

### Проверка production-сборки

```powershell
npm run build
```

Проверяет TypeScript и собирает production-версию приложения в папку `dist`.

### Локальная проверка Vercel Functions

```powershell
npm run dev:vercel
```

Запускает проект через Vercel CLI, чтобы локально проверить endpoints из папки `api`.

### Проверка простого API endpoint

```powershell
Invoke-RestMethod -Uri "https://habit-tracker-v10.vercel.app/api/ping"
```

Проверяет, что Vercel Functions вообще работают. Если endpoint отвечает `ok: true`, серверная часть доступна.

### Проверка БД и env-переменных

```powershell
$key = "ВАШ_APP_ACCESS_KEY"
Invoke-RestMethod -Uri "https://habit-tracker-v10.vercel.app/api/health" -Headers @{ "x-tracker-key" = $key }
```

Проверяет:

- видит ли сервер `APP_ACCESS_KEY`;
- видит ли сервер `DATABASE_URL`;
- может ли функция подключиться к PostgreSQL;
- может ли создать таблицу `habit_tracker_state`.

## Переменные окружения Vercel

### `APP_ACCESS_KEY`

Личный секретный ключ доступа. Его вводишь в приложении на ПК и телефоне. Без него API не должен отдавать данные.

### `DATABASE_URL`

Строка подключения к облачной PostgreSQL БД. Пример формата:

```env
postgresql://user:password@real-host/database?sslmode=require
```

Важно: `host` должен быть настоящим адресом базы, например `ep-...neon.tech`, а не словом `host`.

### `GEMINI_API_KEY`

Секретный ключ Gemini. Хранится только в Vercel, не в GitHub и не в браузере.

### `GEMINI_MODEL`

Название модели для AI-рекомендаций.

```env
GEMINI_MODEL=gemini-2.5-flash
```

## Ошибки, которые встретились

### `Author identity unknown`

Git не знает имя и email автора commit. Решается командами:

```powershell
git config --global user.name "Ваше Имя"
git config --global user.email "ваш_email@example.com"
```

### `remote origin already exists`

Remote `origin` уже был добавлен. Нужно не добавлять заново, а заменить URL:

```powershell
git remote set-url origin https://github.com/ВАШ_ЛОГИН/habit-tracker.git
```

### `src refspec main does not match any`

Ветка `main` еще не создана или нет ни одного commit. Обычно нужно сначала сделать:

```powershell
git add .
git commit -m "Initial habit tracker"
git branch -M main
```

### `The provided GitHub repository does not contain the requested branch`

Vercel не нашел нужную ветку или commit. Причины:

- репозиторий GitHub пустой;
- код не был отправлен через `git push`;
- Vercel смотрит не на ту ветку.

### `NOT_FOUND`

Endpoint или страница не найдены в текущем деплое. В нашем случае это означало, что новый файл API еще не попал в production deploy.

### `FUNCTION_INVOCATION_FAILED`

Vercel Function упала во время выполнения. Нужно смотреть Runtime Logs в Vercel.

### `getaddrinfo ENOTFOUND host`

В `DATABASE_URL` был указан ненастоящий host. Нужно вставить реальную строку подключения к облачной PostgreSQL БД.

## Что нужно подтянуть дальше

### Git

- `git status`
- `git add`
- `git commit`
- `git push`
- ветки
- remote origin
- разница между локальным проектом и GitHub

### Vercel

- Deployments
- Production vs Preview
- Redeploy
- Runtime Logs
- Environment Variables
- Vercel Functions

### Базы данных

- что такое PostgreSQL;
- что такое connection string;
- что такое host, user, password, database;
- зачем нужен `sslmode=require`;
- чем БД отличается от `localStorage`.

### API

- endpoint;
- `GET`, `POST`, `PUT`;
- headers;
- JSON;
- почему секретные ключи должны жить на сервере.

### Безопасность

- не показывать ключи в чатах и скриншотах;
- менять ключи, если они засветились;
- использовать длинные случайные секреты;
- не коммитить `.env` файлы в GitHub.

### React

- компоненты;
- props;
- `useState`;
- `useEffect`;
- работа с формами;
- рендер списков;
- обновление состояния без мутаций.

## Практический следующий шаг

Сделать маленькую привычку для самого обучения:

- 15 минут в день читать Git/Vercel/React;
- после каждого изменения делать `git status`;
- писать осмысленный commit;
- смотреть, как Vercel автоматически деплоит новую версию.
