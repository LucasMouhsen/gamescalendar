import type { Game } from "./types";

export const monthTitle = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export const dayTitle = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
});

export function formatMonth(date: Date) {
  return monthTitle.format(date);
}

export function formatDayLabel(dateString: string) {
  return dayTitle.format(new Date(`${dateString}T12:00:00`));
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function monthRange(currentMonth: Date) {
  const firstDay = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const lastDay = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

  return {
    startDate: toIsoDate(firstDay),
    endDate: toIsoDate(lastDay),
  };
}

export function futureRange(monthsAhead = 4) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, 0));

  return {
    startDate: toIsoDate(now),
    endDate: toIsoDate(end),
  };
}

export function groupGamesByDate(games: Game[]) {
  return games.reduce<Record<string, Game[]>>((groups, game) => {
    const bucket = groups[game.date] || [];
    bucket.push(game);
    groups[game.date] = bucket;
    return groups;
  }, {});
}

export function buildCalendarDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index + 1));
    return {
      day: index + 1,
      iso: toIsoDate(date),
    };
  });
}

export function headlinePlatform(game: Game) {
  return game.platform?.abbreviation || game.platform?.slug?.toUpperCase() || "TBA";
}
