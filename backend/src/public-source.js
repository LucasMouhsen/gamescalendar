import { config } from "./config.js";

const PUBLIC_BASE_URL = "https://gamerelease.app/api/games";

const PUBLIC_PLATFORMS = [
  { id: 6, name: "PC (Microsoft Windows)", slug: "pc", abbreviation: "PC" },
  { id: 14, name: "Mac", slug: "mac", abbreviation: "MAC" },
  { id: 3, name: "Linux", slug: "linux", abbreviation: "LIN" },
  { id: 130, name: "Nintendo Switch", slug: "switch", abbreviation: "NS" },
  { id: 508, name: "Nintendo Switch 2", slug: "switch-2", abbreviation: "NS2" },
  { id: 48, name: "PlayStation 4", slug: "ps4", abbreviation: "PS4" },
  { id: 167, name: "PlayStation 5", slug: "ps5", abbreviation: "PS5" },
  { id: 169, name: "Xbox Series X|S", slug: "xbox-series", abbreviation: "XSX" },
  { id: 34, name: "Android", slug: "android", abbreviation: "AND" },
  { id: 39, name: "iOS", slug: "ios", abbreviation: "iOS" },
  { id: 163, name: "SteamVR", slug: "steamvr", abbreviation: "VR" },
  { id: 99, name: "Family Computer", slug: "family-computer", abbreviation: "FC" },
  { id: 18, name: "Nintendo Entertainment System", slug: "nes", abbreviation: "NES" },
];

const queryCache = new Map();

function platformSlug(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function platformAbbreviation(name = "") {
  const known = PUBLIC_PLATFORMS.find((entry) => entry.name === name);
  if (known?.abbreviation) {
    return known.abbreviation;
  }

  return name
    .split(/\s+/)
    .map((entry) => entry[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function normalizePlatform(entry) {
  const platform = entry?.platform ?? entry;
  const known = PUBLIC_PLATFORMS.find((item) => item.id === platform.id);

  return {
    id: platform.id,
    name: platform.name,
    slug: known?.slug || platformSlug(platform.name || String(platform.id)),
    abbreviation: known?.abbreviation || platformAbbreviation(platform.name),
  };
}

function collectCompanies(entries = [], predicate) {
  return entries
    .filter(predicate)
    .map((entry) => entry.company)
    .filter(Boolean)
    .map((company) => ({ id: company.id, name: company.name }));
}

function normalizeGame(game, platformIds = []) {
  const normalizedPlatforms = (game.platforms || []).map(normalizePlatform);
  const matchingPlatform =
    normalizedPlatforms.find((platform) => platformIds.includes(platform.id)) ||
    normalizedPlatforms[0] ||
    null;

  return {
    id: game.id,
    name: game.name,
    summary: game.summary || "",
    storyline: game.storyline || "",
    cover: game.background_image ? { url: game.background_image } : null,
    artworks: (game.screenshots || []).slice(0, 8).map((shot) => ({
      id: shot.id,
      url: shot.url.replace("t_screenshot_big", "t_1080p"),
    })),
    videos: (game.videos || []).slice(0, 4).map((video) => ({
      id: video.id,
      video_id: video.video_id,
    })),
    websites: (game.websites || []).map((website) => ({
      url: website.url,
    })),
    genres: (game.genres || []).map((genre) => ({ id: genre.id, name: genre.name })),
    game_modes: (game.game_modes || []).map((mode) => ({ id: mode.id, name: mode.name })),
    developer: collectCompanies(game.involved_companies, (entry) => entry.developer),
    publisher: collectCompanies(game.involved_companies, (entry) => entry.publisher),
    total_rating: Math.round(game.metacritic || game.rating || 0),
    hypes: game.hypes || 0,
    date: game.released,
    platform: matchingPlatform,
  };
}

async function cachedJson(url) {
  const cached = queryCache.get(url);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "gamecalendar-clone/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Public source failed with ${response.status}`);
  }

  const data = await response.json();
  queryCache.set(url, {
    data,
    expiresAt: Date.now() + config.cacheTtlMs,
  });

  return data;
}

export async function fetchPublicPlatforms(platformIds = []) {
  if (!platformIds.length) {
    return PUBLIC_PLATFORMS;
  }

  return PUBLIC_PLATFORMS.filter((platform) => platformIds.includes(platform.id));
}

export async function fetchPublicGames({
  startDate,
  endDate,
  platformIds = [],
  minHype = 0,
  withRating = false,
}) {
  const query = new URLSearchParams({
    startDate,
    endDate,
    gamesPerDay: "50",
    locale: "en",
  });

  const url = `${PUBLIC_BASE_URL}/upcoming?${query}`;
  const data = await cachedJson(url);
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .filter((game) => {
      const hasPlatform =
        !platformIds.length ||
        (game.platforms || []).some((entry) => platformIds.includes(entry.platform?.id));
      const hasHype = (game.hypes || 0) >= minHype;
      const hasRating = !withRating || Math.round(game.metacritic || game.rating || 0) > 0;

      return hasPlatform && hasHype && hasRating;
    })
    .map((game) => normalizeGame(game, platformIds))
    .sort((left, right) => {
      if (left.date === right.date) {
        return right.hypes - left.hypes;
      }

      return left.date.localeCompare(right.date);
    });
}
