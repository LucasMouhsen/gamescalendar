import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "frontend", "public", "data");

const DEFAULT_PLATFORMS = [6, 130, 167, 169, 508];
const KNOWN_PLATFORMS = [
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

function platformSlug(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function platformAbbreviation(name = "") {
  const known = KNOWN_PLATFORMS.find((entry) => entry.name === name);
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
  const known = KNOWN_PLATFORMS.find((item) => item.id === platform.id);

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

function buildLocalizedFields(game) {
  return {
    name: game.name || "",
    summary: game.summary || "",
    storyline: game.storyline || "",
    genres: (game.genres || []).map((genre) => ({ id: genre.id, name: genre.name })),
    game_modes: (game.game_modes || []).map((mode) => ({ id: mode.id, name: mode.name })),
  };
}

function normalizeGame(game, spanishGame) {
  const normalizedPlatforms = (game.platforms || []).map(normalizePlatform);

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
    platform: normalizedPlatforms[0] || null,
    platforms: normalizedPlatforms,
    translations: spanishGame
      ? {
          es: buildLocalizedFields(spanishGame),
        }
      : undefined,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "gamecalendar-clone-static/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}`);
  }

  return response.json();
}

function dedupeGames(games) {
  const byId = new Map();

  for (const game of games) {
    const current = byId.get(game.id);
    if (!current) {
      byId.set(game.id, game);
      continue;
    }

    const currentPlatforms = new Map((current.platforms || []).map((platform) => [platform.id, platform]));
    for (const platform of game.platforms || []) {
      currentPlatforms.set(platform.id, platform);
    }

    byId.set(game.id, {
      ...current,
      ...game,
      platforms: [...currentPlatforms.values()],
      platform: current.platform || game.platform || null,
    });
  }

  return [...byId.values()].sort((left, right) => {
    if (left.date === right.date) {
      return right.hypes - left.hypes;
    }

    return left.date.localeCompare(right.date);
  });
}

function collectPlatformsFromGames(games) {
  const platformMap = new Map(KNOWN_PLATFORMS.map((platform) => [platform.id, platform]));

  for (const game of games) {
    for (const platform of game.platforms || []) {
      platformMap.set(platform.id, platform);
    }
  }

  return [...platformMap.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function fetchYearGames(year) {
  const buildUrl = (kind, locale) =>
    `https://gamerelease.app/api/games/${kind}?year=${year}&limit=500&locale=${locale}`;

  const [releasedEn, futureEn, releasedEs, futureEs] = await Promise.all([
    fetchJson(buildUrl("by-year", "en")).catch(() => ({ results: [] })),
    fetchJson(buildUrl("future-by-year", "en")).catch(() => ({ results: [] })),
    fetchJson(buildUrl("by-year", "es")).catch(() => ({ results: [] })),
    fetchJson(buildUrl("future-by-year", "es")).catch(() => ({ results: [] })),
  ]);

  const spanishById = new Map(
    [...(releasedEs.results || []), ...(futureEs.results || [])].map((game) => [game.id, game]),
  );
  const normalized = [...(releasedEn.results || []), ...(futureEn.results || [])].map((game) =>
    normalizeGame(game, spanishById.get(game.id)),
  );
  return dedupeGames(normalized);
}

async function main() {
  const currentYear = new Date().getUTCFullYear();
  const startYear = Number(process.env.STATIC_START_YEAR || currentYear - 1);
  const endYear = Number(process.env.STATIC_END_YEAR || currentYear + 2);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);

  if (years.length < 1) {
    throw new Error("Snapshot generation requires at least one year.");
  }

  await mkdir(outputDir, { recursive: true });

  const yearGamesEntries = await Promise.all(
    years.map(async (year) => [year, await fetchYearGames(year)]),
  );

  const allGames = yearGamesEntries.flatMap(([, games]) => games);
  const platforms = collectPlatformsFromGames(allGames);

  if (!allGames.length) {
    throw new Error("Snapshot generation returned no games.");
  }

  if (!platforms.length) {
    throw new Error("Snapshot generation returned no platforms.");
  }

  await writeFile(
    path.join(outputDir, "config.json"),
    JSON.stringify(
      {
        mode: "static",
        defaultPlatforms: DEFAULT_PLATFORMS,
        years,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  await writeFile(path.join(outputDir, "platforms.json"), JSON.stringify(platforms, null, 2));

  for (const [year, games] of yearGamesEntries) {
    await writeFile(path.join(outputDir, `games-${year}.json`), JSON.stringify(games, null, 2));
  }

  console.log(`Generated static snapshot for years ${years.join(", ")}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
