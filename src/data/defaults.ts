import type { AppState, Habit, HabitCategory } from "../types";

export const habitCategories: HabitCategory[] = [
  "Утро",
  "Рабочий день",
  "Активность",
  "Вечер",
  "Здоровье"
];

export const quotes = [
  "Дисциплина не делает день идеальным. Она делает следующий шаг очевидным.",
  "Большие изменения редко выглядят героически. Чаще всего это просто галочка сегодня.",
  "Энергия возвращается туда, где есть ритм.",
  "Тело любит доказательства, а не обещания.",
  "Не надо побеждать весь день. Достаточно выиграть ближайшие пятнадцать минут.",
  "Прогресс начинается там, где решение стало маленьким.",
  "Лучший план на день тот, который выдерживает реальную жизнь.",
  "Сила привычки не в строгости, а в повторяемости.",
  "Двигайся до того, как усталость станет аргументом.",
  "Спокойный темп тоже ведет вперед."
];

export const defaultHabits: Habit[] = [
  {
    id: "morning-water",
    title: "Выпить стакан воды",
    category: "Утро",
    cue: "После пробуждения",
    target: "250-300 мл, если врач не ограничивал жидкость",
    healthContext: "Поддержка гидратации при склонности к камням",
    enabled: true,
    order: 10
  },
  {
    id: "morning-pressure",
    title: "Измерить давление",
    category: "Утро",
    cue: "До кофе и активных дел",
    target: "Записать показатель в журнал давления",
    healthContext: "Контроль гипертонии",
    enabled: true,
    order: 20
  },
  {
    id: "morning-teeth",
    title: "Почистить зубы",
    category: "Утро",
    cue: "После завтрака",
    target: "2 минуты, не спеша",
    healthContext: "Ежедневная гигиена",
    enabled: true,
    order: 25
  },
  {
    id: "morning-mobility",
    title: "Мягкая зарядка",
    category: "Утро",
    cue: "После воды",
    target: "10 минут: шея, плечи, спина, тазобедренные",
    healthContext: "Компенсация сидячей нагрузки",
    enabled: true,
    order: 30
  },
  {
    id: "breaks-hourly",
    title: "Перерыв от сидения",
    category: "Рабочий день",
    cue: "Каждый час работы",
    target: "2-3 минуты встать, пройтись, раскрыть грудной отдел",
    healthContext: "Снижение длительной статической нагрузки",
    enabled: true,
    order: 40
  },
  {
    id: "eyes-20-20",
    title: "Гимнастика для глаз",
    category: "Рабочий день",
    cue: "После двух рабочих блоков",
    target: "2 минуты: дальний фокус, моргание, мягкое расслабление",
    healthContext: "Близорукость и работа за экраном",
    enabled: true,
    order: 50
  },
  {
    id: "lunch-walk",
    title: "Прогулка в обед",
    category: "Активность",
    cue: "12:00-14:00",
    target: "15-25 минут спокойной ходьбы",
    healthContext: "Настроение, давление, общая активность",
    enabled: true,
    order: 60
  },
  {
    id: "pushups",
    title: "Отжимания",
    category: "Активность",
    cue: "После работы или перед душем",
    target: "2-4 подхода без отказа, с опорой на стол при необходимости",
    healthContext: "Силовая нагрузка без резких рекордов",
    enabled: true,
    order: 70
  },
  {
    id: "squats",
    title: "Приседания",
    category: "Активность",
    cue: "В паре с отжиманиями",
    target: "2-4 подхода по комфортному самочувствию",
    healthContext: "Ноги, кровообращение, компенсация сидения",
    enabled: true,
    order: 80
  },
  {
    id: "back-bridge",
    title: "Ортопедический мостик для спины",
    category: "Активность",
    cue: "После работы или длительного сидения",
    target: "15 минут по инструкции к устройству",
    healthContext: "Разгрузка спины с учетом рекомендаций врача",
    enabled: true,
    order: 85
  },
  {
    id: "posture-corset",
    title: "Корсет для осанки",
    category: "Здоровье",
    cue: "В первой половине дня",
    target: "Носить 2 часа по назначению специалиста",
    healthContext: "Контроль осанки без превышения назначенного времени",
    enabled: true,
    order: 88
  },
  {
    id: "water-day",
    title: "Стакан воды каждый час",
    category: "Здоровье",
    cue: "Во время бодрствования",
    target: "1 стакан каждый час, если врач не ограничивал жидкость",
    healthContext: "Гидратация при склонности к камням",
    enabled: true,
    order: 90
  },
  {
    id: "salt-control",
    title: "Умерить соль",
    category: "Здоровье",
    cue: "При выборе еды",
    target: "Не досаливать автоматически, избегать очень соленых продуктов",
    healthContext: "Поддержка контроля давления",
    enabled: true,
    order: 100
  },
  {
    id: "evening-walk",
    title: "Вечерняя прогулка",
    category: "Вечер",
    cue: "После ужина",
    target: "20-30 минут легким темпом",
    healthContext: "Сон, настроение, давление",
    enabled: true,
    order: 110
  },
  {
    id: "learning-video",
    title: "Посмотреть 1 учебное видео",
    category: "Вечер",
    cue: "После основных дел",
    target: "10-25 минут с одной короткой заметкой",
    healthContext: "Развитие без бесконечной ленты",
    enabled: true,
    order: 125
  },
  {
    id: "screen-off",
    title: "Чтение книги",
    category: "Вечер",
    cue: "Вечером",
    target: "Читать 1 час",
    healthContext: "Обучение, концентрация и отдых от экрана",
    enabled: true,
    order: 130
  },
  {
    id: "evening-teeth",
    title: "Почистить зубы",
    category: "Вечер",
    cue: "Перед сном",
    target: "2 минуты, после последнего приема пищи",
    healthContext: "Ежедневная гигиена",
    enabled: true,
    order: 140
  }
];

export const createInitialState = (): AppState => ({
  version: 2,
  habits: defaultHabits,
  habitLogs: {},
  bloodPressureLogs: [],
  dailyStepsLogs: [],
  tasks: [
    {
      id: "task-first-review",
      title: "Проверить план дня",
      category: "Работа",
      priority: "high",
      dueDate: new Date().toISOString().slice(0, 10),
      repeat: "daily",
      notes: "Выбрать 1-3 главных результата на сегодня.",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  updatedAt: new Date().toISOString()
});
