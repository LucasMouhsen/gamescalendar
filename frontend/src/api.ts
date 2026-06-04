import type { AppConfig, Game, Platform } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchConfig() {
  const response = await fetch("/api/config");
  return parseJson<AppConfig>(response);
}

export async function fetchPlatforms(platformIds: number[]) {
  const response = await fetch("/api/platforms", {
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

export async function fetchGames(params: {
  startDate: string;
  endDate: string;
  platformIds: number[];
  minHype: number;
  withRating: boolean;
}) {
  const response = await fetch("/api/games", {
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

  return parseJson<Game[]>(response);
}
