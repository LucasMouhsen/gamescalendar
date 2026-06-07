import type { Game } from "./types";

function resolveLocale(locale: string) {
  return locale === "es" ? "es-ES" : "en-US";
}

export function formatMonth(date: Date, locale = "en") {
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatMonthName(monthIndex: number, locale = "en") {
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    month: "long",
  }).format(new Date(2026, monthIndex, 1, 12, 0, 0));
}

export function formatDayLabel(dateString: string, locale = "en") {
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatGameDate(dateString: string, locale = "en") {
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
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

export function futureRangeToYear(lastYear: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(lastYear, 11, 31));

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

export function groupGamesByDate(games: Game[]) {
  return games.reduce<Record<string, Game[]>>((groups, game) => {
    const bucket = groups[game.date] || [];
    bucket.push(game);
    bucket.sort((left, right) => {
      if (left.hypes === right.hypes) {
        return left.name.localeCompare(right.name);
      }
      return right.hypes - left.hypes;
    });
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

export function localizedGameName(game: Game, locale: string) {
  return locale === "es" ? game.translations?.es?.name || game.name : game.name;
}

export function localizedGameSummary(game: Game, locale: string) {
  return locale === "es" ? game.translations?.es?.summary || game.summary : game.summary;
}

export function localizedGameStoryline(game: Game, locale: string) {
  return locale === "es" ? game.translations?.es?.storyline || game.storyline : game.storyline;
}

export function localizedGameGenres(game: Game, locale: string) {
  return locale === "es" ? game.translations?.es?.genres || game.genres : game.genres;
}

export function localizedGameModes(game: Game, locale: string) {
  return locale === "es" ? game.translations?.es?.game_modes || game.game_modes : game.game_modes;
}
