import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  Check,
  ClipboardList,
  Cloud,
  Download,
  Edit3,
  Filter,
  HeartPulse,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  Doughnut,
  Line
} from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { habitCategories, quotes } from "./data/defaults";
import { addDays, addMonths, formatDateLong, formatTime, getDateKey } from "./lib/date";
import { buildLocalRecommendations, getHabitCompletion, getMonthlyHabitSeries, getWeeklyHabitSeries } from "./lib/stats";
import { exportState, loadAccessKey, loadState, normalizeState, saveAccessKey, saveState } from "./lib/storage";
import { pullRemoteState, pushRemoteState, requestAiInsight } from "./lib/sync";
import type {
  AppState,
  BloodPressureEntry,
  Habit,
  HabitCategory,
  Task,
  TaskCategory,
  TaskFilters,
  TaskPriority,
  TaskRepeat
} from "./types";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

const priorityLabels: Record<TaskPriority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий"
};

const repeatLabels: Record<TaskRepeat, string> = {
  none: "Без повтора",
  daily: "Ежедневно",
  weekdays: "По будням",
  weekly: "Еженедельно",
  monthly: "Ежемесячно"
};

const taskCategories: TaskCategory[] = ["Дом", "Работа", "Личное"];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const touch = (state: AppState): AppState => ({
  ...state,
  updatedAt: new Date().toISOString()
});

const getTimeValue = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const getNextDueDate = (task: Task) => {
  const base = task.dueDate || getDateKey();

  if (task.repeat === "daily") {
    return addDays(base, 1);
  }

  if (task.repeat === "weekdays") {
    let next = addDays(base, 1);
    while ([0, 6].includes(new Date(`${next}T12:00:00`).getDay())) {
      next = addDays(next, 1);
    }
    return next;
  }

  if (task.repeat === "weekly") {
    return addDays(base, 7);
  }

  if (task.repeat === "monthly") {
    return addMonths(base, 1);
  }

  return base;
};

function ClockWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel clock-panel">
      <div className="panel-title">
        <Moon size={18} />
        <span>Сегодня</span>
      </div>
      <div className="clock-time">{formatTime(now)}</div>
      <div className="clock-date">{formatDateLong(now)}</div>
    </section>
  );
}

function QuoteWidget() {
  const todayIndex = useMemo(() => {
    const key = getDateKey().replaceAll("-", "");
    return Number(key) % quotes.length;
  }, []);
  const [index, setIndex] = useState(todayIndex);

  return (
    <section className="panel quote-panel">
      <div className="panel-title">
        <Sparkles size={18} />
        <span>Афоризм</span>
      </div>
      <p>{quotes[index]}</p>
      <button
        className="icon-button"
        type="button"
        title="Другая цитата"
        onClick={() => setIndex((current) => (current + 1) % quotes.length)}
      >
        <RefreshCw size={18} />
      </button>
    </section>
  );
}

interface HabitsPanelProps {
  state: AppState;
  todayKey: string;
  onChange: (updater: (state: AppState) => AppState) => void;
}

function HabitsPanel({ state, todayKey, onChange }: HabitsPanelProps) {
  const [draft, setDraft] = useState({
    title: "",
    category: "Активность" as HabitCategory,
    cue: "",
    target: "",
    healthContext: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Habit | null>(null);

  const habits = useMemo(
    () => [...state.habits].sort((a, b) => a.order - b.order),
    [state.habits]
  );
  const completion = getHabitCompletion(state, todayKey);

  const toggleHabit = (habitId: string) => {
    onChange((current) =>
      touch({
        ...current,
        habitLogs: {
          ...current.habitLogs,
          [todayKey]: {
            ...(current.habitLogs[todayKey] ?? {}),
            [habitId]: !(current.habitLogs[todayKey]?.[habitId] ?? false)
          }
        }
      })
    );
  };

  const addHabit = () => {
    if (!draft.title.trim()) {
      return;
    }

    onChange((current) =>
      touch({
        ...current,
        habits: [
          ...current.habits,
          {
            id: createId(),
            title: draft.title.trim(),
            category: draft.category,
            cue: draft.cue.trim() || "По плану дня",
            target: draft.target.trim() || "Минимальная версия на 2-5 минут",
            healthContext: draft.healthContext.trim(),
            enabled: true,
            order: Math.max(0, ...current.habits.map((habit) => habit.order)) + 10
          }
        ]
      })
    );
    setDraft({
      title: "",
      category: "Активность",
      cue: "",
      target: "",
      healthContext: ""
    });
  };

  const moveHabit = (habitId: string, direction: -1 | 1) => {
    onChange((current) => {
      const sorted = [...current.habits].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((habit) => habit.id === habitId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) {
        return current;
      }

      const first = sorted[index];
      const second = sorted[nextIndex];
      const updated = current.habits.map((habit) => {
        if (habit.id === first.id) {
          return { ...habit, order: second.order };
        }
        if (habit.id === second.id) {
          return { ...habit, order: first.order };
        }
        return habit;
      });

      return touch({ ...current, habits: updated });
    });
  };

  const toggleHabitEnabled = (habitId: string) => {
    onChange((current) =>
      touch({
        ...current,
        habits: current.habits.map((habit) =>
          habit.id === habitId ? { ...habit, enabled: !habit.enabled } : habit
        )
      })
    );
  };

  const deleteHabit = (habitId: string) => {
    onChange((current) =>
      touch({
        ...current,
        habits: current.habits.filter((habit) => habit.id !== habitId)
      })
    );
  };

  const startEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setEditDraft(habit);
  };

  const saveEdit = () => {
    if (!editingId || !editDraft?.title.trim()) {
      return;
    }

    onChange((current) =>
      touch({
        ...current,
        habits: current.habits.map((habit) =>
          habit.id === editingId
            ? {
                ...editDraft,
                title: editDraft.title.trim(),
                cue: editDraft.cue.trim(),
                target: editDraft.target.trim(),
                healthContext: editDraft.healthContext?.trim()
              }
            : habit
        )
      })
    );
    setEditingId(null);
    setEditDraft(null);
  };

  return (
    <section className="panel habits-panel">
      <div className="section-heading">
        <div>
          <div className="panel-title">
            <HeartPulse size={18} />
            <span>Привычки</span>
          </div>
          <strong>{completion.percent}% сегодня</strong>
        </div>
        <span className="metric-pill">
          {completion.completed}/{completion.total}
        </span>
      </div>

      <div className="habit-groups">
        {habitCategories.map((category) => (
          <div className="habit-group" key={category}>
            <h3>{category}</h3>
            {habits
              .filter((habit) => habit.category === category)
              .map((habit) => {
                const checked = state.habitLogs[todayKey]?.[habit.id] ?? false;
                const currentEditDraft = editingId === habit.id ? editDraft : null;

                return (
                  <article
                    className={`habit-row ${checked ? "is-done" : ""} ${
                      habit.enabled ? "" : "is-disabled"
                    }`}
                    key={habit.id}
                  >
                    {currentEditDraft ? (
                      <div className="edit-grid">
                        <input
                          value={currentEditDraft.title}
                          onChange={(event) =>
                            setEditDraft({ ...currentEditDraft, title: event.target.value })
                          }
                          aria-label="Название привычки"
                        />
                        <select
                          value={currentEditDraft.category}
                          onChange={(event) =>
                            setEditDraft({
                              ...currentEditDraft,
                              category: event.target.value as HabitCategory
                            })
                          }
                          aria-label="Категория привычки"
                        >
                          {habitCategories.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <input
                          value={currentEditDraft.cue}
                          onChange={(event) =>
                            setEditDraft({ ...currentEditDraft, cue: event.target.value })
                          }
                          aria-label="Триггер привычки"
                        />
                        <input
                          value={currentEditDraft.target}
                          onChange={(event) =>
                            setEditDraft({ ...currentEditDraft, target: event.target.value })
                          }
                          aria-label="Цель привычки"
                        />
                        <div className="row-actions">
                          <button className="icon-button" type="button" title="Сохранить" onClick={saveEdit}>
                            <Save size={16} />
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            title="Отмена"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft(null);
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label className="check-shell">
                          <input
                            checked={checked}
                            disabled={!habit.enabled}
                            type="checkbox"
                            onChange={() => toggleHabit(habit.id)}
                          />
                          <span>
                            <Check size={15} />
                          </span>
                        </label>
                        <div className="habit-copy">
                          <strong>{habit.title}</strong>
                          <small>{habit.cue} · {habit.target}</small>
                          {habit.healthContext ? <em>{habit.healthContext}</em> : null}
                        </div>
                        <div className="row-actions">
                          <button className="icon-button" type="button" title="Выше" onClick={() => moveHabit(habit.id, -1)}>
                            <ArrowUp size={15} />
                          </button>
                          <button className="icon-button" type="button" title="Ниже" onClick={() => moveHabit(habit.id, 1)}>
                            <ArrowDown size={15} />
                          </button>
                          <button className="icon-button" type="button" title="Редактировать" onClick={() => startEdit(habit)}>
                            <Edit3 size={15} />
                          </button>
                          <button className="icon-button" type="button" title={habit.enabled ? "Выключить" : "Включить"} onClick={() => toggleHabitEnabled(habit.id)}>
                            <Activity size={15} />
                          </button>
                          <button className="icon-button danger" type="button" title="Удалить" onClick={() => deleteHabit(habit.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
          </div>
        ))}
      </div>

      <div className="add-form habit-add-form">
        <input
          placeholder="Новая привычка"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <select
          value={draft.category}
          onChange={(event) => setDraft({ ...draft, category: event.target.value as HabitCategory })}
          aria-label="Категория новой привычки"
        >
          {habitCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <input
          placeholder="Когда"
          value={draft.cue}
          onChange={(event) => setDraft({ ...draft, cue: event.target.value })}
        />
        <input
          placeholder="Минимальная цель"
          value={draft.target}
          onChange={(event) => setDraft({ ...draft, target: event.target.value })}
        />
        <button className="primary-button" type="button" onClick={addHabit}>
          <Plus size={18} />
          <span>Добавить</span>
        </button>
      </div>
    </section>
  );
}

interface TasksPanelProps {
  state: AppState;
  filters: TaskFilters;
  onChange: (updater: (state: AppState) => AppState) => void;
  onFiltersChange: (filters: TaskFilters) => void;
}

function TasksPanel({ state, filters, onChange, onFiltersChange }: TasksPanelProps) {
  const [draft, setDraft] = useState({
    title: "",
    category: "Работа" as TaskCategory,
    priority: "medium" as TaskPriority,
    dueDate: getDateKey(),
    repeat: "none" as TaskRepeat,
    notes: ""
  });

  const tasks = useMemo(() => {
    const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

    return state.tasks
      .filter((task) => filters.category === "all" || task.category === filters.category)
      .filter((task) => filters.priority === "all" || task.priority === filters.priority)
      .filter((task) => {
        if (filters.status === "completed") {
          return task.completed;
        }
        if (filters.status === "active") {
          return !task.completed;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return Number(a.completed) - Number(b.completed);
        }
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [filters, state.tasks]);

  const addTask = () => {
    if (!draft.title.trim()) {
      return;
    }

    const now = new Date().toISOString();
    onChange((current) =>
      touch({
        ...current,
        tasks: [
          ...current.tasks,
          {
            id: createId(),
            title: draft.title.trim(),
            category: draft.category,
            priority: draft.priority,
            dueDate: draft.dueDate,
            repeat: draft.repeat,
            notes: draft.notes.trim(),
            completed: false,
            createdAt: now,
            updatedAt: now
          }
        ]
      })
    );
    setDraft({
      title: "",
      category: "Работа",
      priority: "medium",
      dueDate: getDateKey(),
      repeat: "none",
      notes: ""
    });
  };

  const toggleTask = (task: Task) => {
    const now = new Date().toISOString();

    onChange((current) => {
      const completing = !task.completed;
      const updatedTasks = current.tasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: completing,
              completedAt: completing ? now : undefined,
              updatedAt: now
            }
          : item
      );

      if (completing && task.repeat !== "none") {
        updatedTasks.push({
          ...task,
          id: createId(),
          dueDate: getNextDueDate(task),
          completed: false,
          createdAt: now,
          updatedAt: now,
          completedAt: undefined
        });
      }

      return touch({ ...current, tasks: updatedTasks });
    });
  };

  const deleteTask = (taskId: string) => {
    onChange((current) =>
      touch({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId)
      })
    );
  };

  return (
    <section className="panel tasks-panel">
      <div className="section-heading">
        <div className="panel-title">
          <ClipboardList size={18} />
          <span>Задачи</span>
        </div>
        <div className="filters" aria-label="Фильтры задач">
          <Filter size={16} />
          <select
            value={filters.category}
            onChange={(event) =>
              onFiltersChange({ ...filters, category: event.target.value as TaskFilters["category"] })
            }
            aria-label="Фильтр категории"
          >
            <option value="all">Все категории</option>
            {taskCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(event) =>
              onFiltersChange({ ...filters, priority: event.target.value as TaskFilters["priority"] })
            }
            aria-label="Фильтр приоритета"
          >
            <option value="all">Все приоритеты</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({ ...filters, status: event.target.value as TaskFilters["status"] })
            }
            aria-label="Фильтр статуса"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="completed">Выполненные</option>
          </select>
        </div>
      </div>

      <div className="add-form task-add-form">
        <input
          placeholder="Новая задача"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <select
          value={draft.category}
          onChange={(event) => setDraft({ ...draft, category: event.target.value as TaskCategory })}
          aria-label="Категория задачи"
        >
          {taskCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select
          value={draft.priority}
          onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskPriority })}
          aria-label="Приоритет задачи"
        >
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
        </select>
        <input
          type="date"
          value={draft.dueDate}
          onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
          aria-label="Дедлайн"
        />
        <select
          value={draft.repeat}
          onChange={(event) => setDraft({ ...draft, repeat: event.target.value as TaskRepeat })}
          aria-label="Повтор задачи"
        >
          {Object.entries(repeatLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Заметки"
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
        />
        <button className="primary-button" type="button" onClick={addTask}>
          <Plus size={18} />
          <span>Добавить</span>
        </button>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <article className={`task-row priority-${task.priority} ${task.completed ? "is-done" : ""}`} key={task.id}>
            <label className="check-shell">
              <input checked={task.completed} type="checkbox" onChange={() => toggleTask(task)} />
              <span>
                <Check size={15} />
              </span>
            </label>
            <div className="task-copy">
              <strong>{task.title}</strong>
              <small>
                {task.category} · {priorityLabels[task.priority]} · до {task.dueDate || "без даты"} · {repeatLabels[task.repeat]}
              </small>
              {task.notes ? <p>{task.notes}</p> : null}
            </div>
            <button className="icon-button danger" type="button" title="Удалить" onClick={() => deleteTask(task.id)}>
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

interface BloodPressurePanelProps {
  state: AppState;
  onChange: (updater: (state: AppState) => AppState) => void;
}

function BloodPressurePanel({ state, onChange }: BloodPressurePanelProps) {
  const [draft, setDraft] = useState({
    date: getDateKey(),
    time: getTimeValue(),
    systolic: "",
    diastolic: "",
    pulse: "",
    note: ""
  });

  const entries = useMemo(
    () =>
      [...(state.bloodPressureLogs ?? [])].sort(
        (a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
      ),
    [state.bloodPressureLogs]
  );
  const chartEntries = [...entries]
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(-20);
  const latest = entries[0];

  const addEntry = () => {
    const systolic = Number(draft.systolic);
    const diastolic = Number(draft.diastolic);
    const pulse = draft.pulse ? Number(draft.pulse) : undefined;

    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
      return;
    }

    const entry: BloodPressureEntry = {
      id: createId(),
      date: draft.date || getDateKey(),
      time: draft.time || getTimeValue(),
      systolic,
      diastolic,
      pulse: Number.isFinite(pulse) ? pulse : undefined,
      note: draft.note.trim(),
      recordedAt: new Date().toISOString()
    };

    onChange((current) =>
      touch({
        ...current,
        bloodPressureLogs: [...(current.bloodPressureLogs ?? []), entry]
      })
    );

    setDraft({
      date: getDateKey(),
      time: getTimeValue(),
      systolic: "",
      diastolic: "",
      pulse: "",
      note: ""
    });
  };

  const deleteEntry = (entryId: string) => {
    onChange((current) =>
      touch({
        ...current,
        bloodPressureLogs: (current.bloodPressureLogs ?? []).filter(
          (entry) => entry.id !== entryId
        )
      })
    );
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#c9d4e5",
          boxWidth: 10,
          boxHeight: 10
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#8b98aa" },
        grid: { color: "rgba(139, 152, 170, 0.12)" }
      },
      y: {
        ticks: { color: "#8b98aa" },
        grid: { color: "rgba(139, 152, 170, 0.12)" },
        min: 40,
        suggestedMax: 180
      }
    }
  } as const;

  return (
    <section className="panel blood-pressure-panel">
      <div className="section-heading">
        <div>
          <div className="panel-title">
            <HeartPulse size={18} />
            <span>Давление</span>
          </div>
          <strong>{latest ? `${latest.systolic}/${latest.diastolic}` : "Нет записей"}</strong>
        </div>
        {latest?.pulse ? <span className="metric-pill">Пульс {latest.pulse}</span> : null}
      </div>

      <div className="pressure-form">
        <input
          type="date"
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          aria-label="Дата измерения давления"
        />
        <input
          type="time"
          value={draft.time}
          onChange={(event) => setDraft({ ...draft, time: event.target.value })}
          aria-label="Время измерения давления"
        />
        <input
          inputMode="numeric"
          min="70"
          max="240"
          placeholder="Сист."
          type="number"
          value={draft.systolic}
          onChange={(event) => setDraft({ ...draft, systolic: event.target.value })}
        />
        <input
          inputMode="numeric"
          min="40"
          max="160"
          placeholder="Диаст."
          type="number"
          value={draft.diastolic}
          onChange={(event) => setDraft({ ...draft, diastolic: event.target.value })}
        />
        <input
          inputMode="numeric"
          min="35"
          max="180"
          placeholder="Пульс"
          type="number"
          value={draft.pulse}
          onChange={(event) => setDraft({ ...draft, pulse: event.target.value })}
        />
        <input
          placeholder="Заметка"
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
        />
        <button className="primary-button" type="button" onClick={addEntry}>
          <Save size={18} />
          <span>Записать</span>
        </button>
      </div>

      <div className="pressure-layout">
        <div className="chart-card pressure-chart-card">
          <strong>График последних измерений</strong>
          <div className="chart-box">
            <Line
              data={{
                labels: chartEntries.map((entry) => `${entry.date.slice(5)} ${entry.time}`),
                datasets: [
                  {
                    label: "Систолическое",
                    data: chartEntries.map((entry) => entry.systolic),
                    borderColor: "#f87171",
                    backgroundColor: "rgba(248, 113, 113, 0.12)",
                    tension: 0.28,
                    pointRadius: 3
                  },
                  {
                    label: "Диастолическое",
                    data: chartEntries.map((entry) => entry.diastolic),
                    borderColor: "#60a5fa",
                    backgroundColor: "rgba(96, 165, 250, 0.12)",
                    tension: 0.28,
                    pointRadius: 3
                  }
                ]
              }}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="pressure-list">
          {entries.slice(0, 6).map((entry) => (
            <article className="pressure-row" key={entry.id}>
              <div>
                <strong>{entry.systolic}/{entry.diastolic}</strong>
                <small>
                  {entry.date} · {entry.time}
                  {entry.pulse ? ` · пульс ${entry.pulse}` : ""}
                </small>
                {entry.note ? <p>{entry.note}</p> : null}
              </div>
              <button className="icon-button danger" type="button" title="Удалить" onClick={() => deleteEntry(entry.id)}>
                <Trash2 size={16} />
              </button>
            </article>
          ))}
          {!entries.length ? <small className="muted">Записей давления пока нет.</small> : null}
        </div>
      </div>
    </section>
  );
}

function ChartsPanel({ state }: { state: AppState }) {
  const today = getHabitCompletion(state);
  const week = getWeeklyHabitSeries(state);
  const month = getMonthlyHabitSeries(state);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#c9d4e5",
          boxWidth: 10,
          boxHeight: 10
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#8b98aa" },
        grid: { color: "rgba(139, 152, 170, 0.12)" }
      },
      y: {
        ticks: { color: "#8b98aa" },
        grid: { color: "rgba(139, 152, 170, 0.12)" },
        min: 0,
        max: 100
      }
    }
  } as const;

  return (
    <section className="panel charts-panel">
      <div className="panel-title">
        <BarChart3 size={18} />
        <span>Прогресс</span>
      </div>
      <div className="charts-grid">
        <div className="chart-card">
          <strong>Сегодня</strong>
          <div className="chart-box">
            <Doughnut
              data={{
                labels: ["Выполнено", "Осталось"],
                datasets: [
                  {
                    data: [today.completed, Math.max(today.total - today.completed, 0)],
                    backgroundColor: ["#2dd4bf", "#243142"],
                    borderWidth: 0
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "72%",
                plugins: {
                  legend: {
                    position: "bottom" as const,
                    labels: { color: "#c9d4e5", boxWidth: 10, boxHeight: 10 }
                  }
                }
              }}
            />
            <span className="chart-center">{today.percent}%</span>
          </div>
        </div>
        <div className="chart-card">
          <strong>Неделя</strong>
          <div className="chart-box">
            <Bar
              data={{
                labels: week.map((item) => item.dateKey.slice(5)),
                datasets: [
                  {
                    label: "% выполнения",
                    data: week.map((item) => item.percent),
                    backgroundColor: "#60a5fa",
                    borderRadius: 7
                  }
                ]
              }}
              options={chartOptions}
            />
          </div>
        </div>
        <div className="chart-card wide">
          <strong>Месяц</strong>
          <div className="chart-box">
            <Line
              data={{
                labels: month.map((item) => item.dateKey.slice(5)),
                datasets: [
                  {
                    label: "Тренд",
                    data: month.map((item) => item.percent),
                    borderColor: "#f59e0b",
                    backgroundColor: "rgba(245, 158, 11, 0.14)",
                    tension: 0.35,
                    fill: true,
                    pointRadius: 2
                  }
                ]
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface AiPanelProps {
  state: AppState;
  accessKey: string;
  onChange: (updater: (state: AppState) => AppState) => void;
}

function AiPanel({ state, accessKey, onChange }: AiPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const localRecommendations = buildLocalRecommendations(state);

  const refreshAi = async () => {
    setLoading(true);
    setMessage("");

    try {
      const insight = await requestAiInsight(state, accessKey);
      onChange((current) => touch({ ...current, aiInsight: insight }));
      setMessage("AI-рекомендации обновлены.");
    } catch (error) {
      const details = error instanceof Error ? error.message : "AI сейчас недоступен.";
      setMessage(details);
    } finally {
      setLoading(false);
    }
  };

  const items = state.aiInsight?.recommendations ?? localRecommendations;

  return (
    <section className="panel ai-panel">
      <div className="section-heading">
        <div className="panel-title">
          <Brain size={18} />
          <span>AI-рекомендации</span>
        </div>
        <button className="primary-button" type="button" onClick={refreshAi} disabled={loading || !accessKey.trim()}>
          <Sparkles size={18} />
          <span>{loading ? "Думаю" : "Обновить"}</span>
        </button>
      </div>
      <p className="ai-summary">
        {state.aiInsight?.summary ?? "Рекомендации обновятся после первого успешного AI-запроса."}
      </p>
      <div className="recommendation-list">
        {items.map((item) => (
          <article className="recommendation" key={`${item.title}-${item.priority}`}>
            <span>{item.priority}</span>
            <strong>{item.title}</strong>
            <small>{item.reason}</small>
            <p>{item.action}</p>
          </article>
        ))}
      </div>
      {state.aiInsight?.generatedAt ? (
        <small className="muted">Обновлено: {new Date(state.aiInsight.generatedAt).toLocaleString("ru-RU")}</small>
      ) : null}
      {message ? <small className="status-line">{message}</small> : null}
    </section>
  );
}

interface SyncPanelProps {
  state: AppState;
  accessKey: string;
  syncMessage: string;
  onAccessKeyChange: (key: string) => void;
  onStateChange: (updater: (state: AppState) => AppState) => void;
  onSyncMessage: (message: string) => void;
}

function SyncPanel({
  state,
  accessKey,
  syncMessage,
  onAccessKeyChange,
  onStateChange,
  onSyncMessage
}: SyncPanelProps) {
  const [busy, setBusy] = useState(false);

  const sync = async () => {
    setBusy(true);
    onSyncMessage("");

    try {
      const remote = await pullRemoteState(accessKey);
      const remoteTime = new Date(remote.state.updatedAt || remote.updatedAt).getTime();
      const localTime = new Date(state.updatedAt).getTime();

      if (Number.isFinite(remoteTime) && remoteTime > localTime) {
        onStateChange(() => normalizeState(remote.state));
        onSyncMessage("Загружена более свежая версия с сервера.");
      } else {
        await pushRemoteState(state, accessKey);
        onSyncMessage("Локальные данные сохранены на сервере.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message.includes("404") || message.includes("еще не сохранено")) {
        await pushRemoteState(state, accessKey);
        onSyncMessage("Создана первая серверная копия.");
      } else {
        onSyncMessage(message || "Синхронизация недоступна.");
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `habit-tracker-${getDateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel sync-panel">
      <div className="panel-title">
        <Cloud size={18} />
        <span>Синхронизация</span>
      </div>
      <div className="sync-grid">
        <input
          type="password"
          placeholder="Личный ключ доступа"
          value={accessKey}
          onChange={(event) => onAccessKeyChange(event.target.value)}
        />
        <button className="primary-button" type="button" onClick={sync} disabled={busy || !accessKey.trim()}>
          <Cloud size={18} />
          <span>{busy ? "Синхронизирую" : "Синхронизировать"}</span>
        </button>
        <button className="secondary-button" type="button" onClick={downloadJson}>
          <Download size={18} />
          <span>Экспорт</span>
        </button>
      </div>
      <small className="muted">
        Последнее изменение: {new Date(state.updatedAt).toLocaleString("ru-RU")}
      </small>
      {syncMessage ? <small className="status-line">{syncMessage}</small> : null}
      <small className="muted">Медицинские решения и лекарства сверяйте с врачом.</small>
    </section>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [accessKey, setAccessKey] = useState(() => loadAccessKey());
  const [syncMessage, setSyncMessage] = useState("");
  const [filters, setFilters] = useState<TaskFilters>({
    category: "all",
    priority: "all",
    status: "active"
  });
  const todayKey = getDateKey();
  const today = getHabitCompletion(state, todayKey);
  const activeTasks = state.tasks.filter((task) => !task.completed).length;
  const highPriority = state.tasks.filter((task) => !task.completed && task.priority === "high").length;

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    saveAccessKey(accessKey);
  }, [accessKey]);

  const updateState = (updater: (state: AppState) => AppState) => {
    setState((current) => updater(current));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Личный дашборд</span>
          <h1>Трекер привычек</h1>
        </div>
        <div className="top-metrics">
          <span>
            <strong>{today.percent}%</strong>
            привычки
          </span>
          <span>
            <strong>{activeTasks}</strong>
            задач
          </span>
          <span>
            <strong>{highPriority}</strong>
            высокий
          </span>
        </div>
      </header>

      <div className="dashboard-grid">
        <ClockWidget />
        <QuoteWidget />
        <HabitsPanel state={state} todayKey={todayKey} onChange={updateState} />
        <TasksPanel state={state} filters={filters} onChange={updateState} onFiltersChange={setFilters} />
        <BloodPressurePanel state={state} onChange={updateState} />
        <ChartsPanel state={state} />
        <AiPanel state={state} accessKey={accessKey} onChange={updateState} />
        <SyncPanel
          state={state}
          accessKey={accessKey}
          syncMessage={syncMessage}
          onAccessKeyChange={setAccessKey}
          onStateChange={updateState}
          onSyncMessage={setSyncMessage}
        />
      </div>
    </main>
  );
}
