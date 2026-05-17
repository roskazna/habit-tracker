import { createInitialState } from "../data/defaults";
import type { AppState } from "../types";

const STATE_KEY = "personal-habit-tracker-state";
const ACCESS_KEY = "personal-habit-tracker-access-key";

export const normalizeState = (state: Partial<AppState>): AppState => {
  const initial = createInitialState();
  const baseHabits = state.habits?.length ? state.habits : initial.habits;
  const existingHabitIds = new Set(baseHabits.map((habit) => habit.id));
  const missingDefaultHabits = initial.habits.filter(
    (habit) => !existingHabitIds.has(habit.id)
  );

  return {
    ...initial,
    ...state,
    habits: [...baseHabits, ...missingDefaultHabits].sort((a, b) => a.order - b.order),
    habitLogs: state.habitLogs ?? {},
    bloodPressureLogs: state.bloodPressureLogs ?? [],
    tasks: state.tasks ?? []
  };
};

export const loadState = (): AppState => {
  const raw = localStorage.getItem(STATE_KEY);

  if (!raw) {
    return createInitialState();
  }

  try {
    return normalizeState(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return createInitialState();
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
};

export const loadAccessKey = () => localStorage.getItem(ACCESS_KEY) ?? "";

export const saveAccessKey = (key: string) => {
  if (!key.trim()) {
    localStorage.removeItem(ACCESS_KEY);
    return;
  }

  localStorage.setItem(ACCESS_KEY, key.trim());
};

export const exportState = (state: AppState) =>
  JSON.stringify(state, null, 2);
