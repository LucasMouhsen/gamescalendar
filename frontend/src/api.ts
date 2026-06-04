import type { AppConfig, Game, Platform } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const STATIC_DATA_MODE = import.meta.env.VITE_DATA_SOURCE === "static";
const BASE_URL = import.meta.env.BASE_URL || "/";
const staticYearCache = new Map<number, Promise<Game[]>>();

function withBase(path: string) {
  return `${BASE_URL}${path.replace(/^\//, "")}`;
}

function apiUrl(path: string) {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function staticConfigUrl() {
  return withBase("/data/config.json");
}

function staticPlatformsUrl() {
  return withBase("/data/platforms.json");
}

function staticGamesUrl(year: number) {
  return withBase(`/data/games-${year}.json`);
}

function yearsBetween(startDate: string, endDate: string) {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}

function filterStaticGames(
  games: Game[],
  params: {
    startDate: string;
    endDate: string;
    platformIds: number[];
    minHype: number;
    withRating: boolean;
  },
) {
  return games.filter((game) => {
    const inRange = game.date >= params.startDate && game.date <= params.endDate;
    const platforms = game.platforms?.length ? game.platforms : game.platform ? [game.platform] : [];
    const inPlatform =
      !params.platformIds.length || platforms.some((platform) => params.platformIds.includes(platform.id));
    const inHype = (game.hypes || 0) >= params.minHype;
    const hasRating = !params.withRating || game.total_rating > 0;

    return inRange && inPlatform && inHype && hasRating;
  });
}

function sortGames(left: Game, right: Game) {
  if (left.date === right.date) {
    return right.hypes - left.hypes;
  }

  return left.date.localeCompare(right.date);
}

export async function fetchConfig() {
  if (STATIC_DATA_MODE) {
    const response = await fetch(staticConfigUrl());
    return parseJson<AppConfig>(response);
  }

  const response = await fetch(apiUrl("/api/config"));
  return parseJson<AppConfig>(response);
}

export async function fetchPlatforms(platformIds: number[]) {
  if (STATIC_DATA_MODE) {
    const response = await fetch(staticPlatformsUrl());
    const platforms = await parseJson<Platform[]>(response);
    if (!platformIds.length) {
      return platforms;
    }
    return platforms.filter((platform) => platformIds.includes(platform.id));
  }

  const response = await fetch(apiUrl("/api/platforms"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform_ids: platformIds,
    }),
  });

  return parseJson<Platform[]>(response);
}

async function fetchStaticYear(year: number) {
  const cached = staticYearCache.get(year);
  if (cached) {
    return cached;
  }

  const request = fetch(staticGamesUrl(year)).then((response) => parseJson<Game[]>(response));
  staticYearCache.set(year, request);
  return request;
}

export async function fetchGames(params: {
  startDate: string;
  endDate: string;
  platformIds: number[];
  minHype: number;
  withRating: boolean;
}) {
  if (STATIC_DATA_MODE) {
    const years = yearsBetween(params.startDate, params.endDate);
    const batches = await Promise.all(years.map((year) => fetchStaticYear(year)));
    return filterStaticGames(batches.flat(), params).sort(sortGames);
  }

  const response = await fetch(apiUrl("/api/games"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_date: params.startDate,
      end_date: params.endDate,
      platform_ids: params.platformIds,
      hypes: params.minHype,
      score: params.withRating,
    }),
  });

  return parseJson<Game[]>(response).then((games) => games.sort(sortGames));
}
