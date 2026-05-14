import type { AiRecommendation, AppState, Habit, Task } from "../types";
import { getDateKey, getRecentDateKeys } from "./date";

export const getEnabledHabits = (habits: Habit[]) =>
  habits.filter((habit) => habit.enabled).sort((a, b) => a.order - b.order);

export const getHabitCompletion = (
  state: AppState,
  dateKey = getDateKey()
) => {
  const enabled = getEnabledHabits(state.habits);
  const log = state.habitLogs[dateKey] ?? {};
  const completed = enabled.filter((habit) => log[habit.id]).length;

  return {
    completed,
    total: enabled.length,
    percent: enabled.length ? Math.round((completed / enabled.length) * 100) : 0
  };
};

export const getWeeklyHabitSeries = (state: AppState) =>
  getRecentDateKeys(7).map((dateKey) => ({
    dateKey,
    ...getHabitCompletion(state, dateKey)
  }));

export const getMonthlyHabitSeries = (state: AppState) =>
  getRecentDateKeys(30).map((dateKey) => ({
    dateKey,
    ...getHabitCompletion(state, dateKey)
  }));

export const getMissedHabits = (state: AppState) => {
  const days = getRecentDateKeys(7);
  const enabled = getEnabledHabits(state.habits);

  return enabled
    .map((habit) => {
      const missed = days.filter((dateKey) => !state.habitLogs[dateKey]?.[habit.id])
        .length;
      return { habit, missed };
    })
    .sort((a, b) => b.missed - a.missed);
};

export const getActiveTasks = (tasks: Task[]) =>
  tasks.filter((task) => !task.completed);

export const getOverdueTasks = (tasks: Task[]) => {
  const today = getDateKey();
  return getActiveTasks(tasks).filter((task) => task.dueDate && task.dueDate < today);
};

export const buildLocalRecommendations = (state: AppState): AiRecommendation[] => {
  const today = getHabitCompletion(state);
  const missed = getMissedHabits(state).filter((item) => item.missed >= 3);
  const overdue = getOverdueTasks(state.tasks);
  const highTasks = getActiveTasks(state.tasks).filter((task) => task.priority === "high");

  const recommendations: AiRecommendation[] = [];

  if (today.percent < 50) {
    recommendations.push({
      title: "Сузить фокус до трех галочек",
      reason: "Когда день проседает, длинный список начинает давить.",
      action: "Выберите воду, короткую прогулку и один силовой блок без отказа.",
      priority: "сегодня"
    });
  }

  if (missed.length > 0) {
    recommendations.push({
      title: `Упростить привычку: ${missed[0].habit.title}`,
      reason: `За 7 дней она пропущена ${missed[0].missed} раз.`,
      action: "Сделайте минимальную версию на 2 минуты и привяжите к уже существующему действию.",
      priority: "на неделе"
    });
  }

  if (overdue.length > 0) {
    recommendations.push({
      title: "Разобрать просроченные задачи",
      reason: `Просрочено задач: ${overdue.length}. Это создает лишний шум в дашборде.`,
      action: "Удалите неактуальные, остальным поставьте новую дату и один следующий шаг.",
      priority: "сегодня"
    });
  }

  if (highTasks.length > 3) {
    recommendations.push({
      title: "Ограничить высокий приоритет",
      reason: "Когда все срочно, приоритет перестает помогать.",
      action: "Оставьте высоким только один главный рабочий и один личный пункт.",
      priority: "наблюдать"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Сохранять текущий ритм",
      reason: "Критичных провалов по задачам и привычкам сейчас не видно.",
      action: "Добавьте один небольшой запас: короткая прогулка или растяжка до усталости.",
      priority: "наблюдать"
    });
  }

  return recommendations;
};
