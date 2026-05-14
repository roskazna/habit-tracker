export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDateLong = (date = new Date()) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long"
  }).format(date);

export const formatTime = (date = new Date()) =>
  new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);

export const addDays = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
};

export const addMonths = (dateKey: string, months: number) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return getDateKey(date);
};

export const getRecentDateKeys = (count: number, endDate = new Date()) => {
  const keys: string[] = [];
  const cursor = new Date(endDate);
  cursor.setHours(12, 0, 0, 0);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - index);
    keys.push(getDateKey(date));
  }

  return keys;
};
