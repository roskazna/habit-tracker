import { createInitialState } from "../data/defaults";
import type { AppState } from "../types";

const STATE_KEY = "personal-habit-tracker-state";
const ACCESS_KEY = "personal-habit-tracker-access-key";

export const loadState = (): AppState => {
  const raw = localStorage.getItem(STATE_KEY);

  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...createInitialState(),
      ...parsed,
      habits: parsed.habits?.length ? parsed.habits : createInitialState().habits,
      habitLogs: parsed.habitLogs ?? {},
      tasks: parsed.tasks ?? []
    };
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
