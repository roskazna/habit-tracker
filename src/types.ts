export type HabitCategory =
  | "Утро"
  | "Рабочий день"
  | "Активность"
  | "Вечер"
  | "Здоровье";

export type TaskCategory = "Дом" | "Работа" | "Личное";
export type TaskPriority = "high" | "medium" | "low";
export type TaskRepeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";
export type TaskStatusFilter = "all" | "active" | "completed";

export interface Habit {
  id: string;
  title: string;
  category: HabitCategory;
  cue: string;
  target: string;
  healthContext?: string;
  enabled: boolean;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string;
  repeat: TaskRepeat;
  notes: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BloodPressureEntry {
  id: string;
  date: string;
  time: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  note?: string;
  recordedAt: string;
}

export interface DailyStepsEntry {
  id: string;
  date: string;
  steps: number;
  note?: string;
  recordedAt: string;
}

export interface AiRecommendation {
  title: string;
  reason: string;
  action: string;
  priority: "сегодня" | "на неделе" | "наблюдать";
}

export interface AiInsight {
  generatedAt: string;
  summary: string;
  recommendations: AiRecommendation[];
  focusHabitIds: string[];
}

export interface AppState {
  version: number;
  habits: Habit[];
  habitLogs: Record<string, Record<string, boolean>>;
  bloodPressureLogs: BloodPressureEntry[];
  dailyStepsLogs: DailyStepsEntry[];
  tasks: Task[];
  aiInsight?: AiInsight;
  updatedAt: string;
}

export interface SyncEnvelope {
  state: AppState;
  updatedAt: string;
}

export interface TaskFilters {
  category: "all" | TaskCategory;
  priority: "all" | TaskPriority;
  status: TaskStatusFilter;
}
