import { config } from "./config.js";

const tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

const queryCache = new Map();

async function getAccessToken() {
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    client_id: config.twitchClientId,
    client_secret: config.twitchClientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Twitch auth failed with ${response.status}`);
  }

  const json = await response.json();
  tokenCache.accessToken = json.access_token;
  tokenCache.expiresAt = Date.now() + (json.expires_in - 60) * 1000;

  return tokenCache.accessToken;
}

async function igdbRequest(endpoint, body) {
  const cacheKey = `${endpoint}:${body}`;
  const cached = queryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": config.twitchClientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB ${endpoint} failed with ${response.status}: ${text}`);
  }

  const data = await response.json();

  queryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + config.cacheTtlMs,
  });

  return data;
}

function toUnixSeconds(dateString, endOfDay = false) {
  const date = new Date(`${dateString}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Math.floor(date.getTime() / 1000);
}

function safeImage(url, size = "t_cover_big") {
  if (!url) {
    return "";
  }

  return url.replace("t_thumb", size);
}

function collectCompanies(companies = [], predicate) {
  return companies
    .filter(predicate)
    .map((entry) => entry.company)
    .filter(Boolean)
    .map((company) => ({ id: company.id, name: company.name }));
}

function normalizeGame(game, releaseDate, platformMap) {
  return {
    id: game.id,
    name: game.name,
    summary: game.summary || "",
    storyline: game.storyline || "",
    cover: game.cover?.url ? { url: safeImage(game.cover.url) } : null,
    artworks: (game.artworks || []).slice(0, 6).map((artwork) => ({
      id: artwork.id,
      url: safeImage(artwork.url, "t_1080p"),
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
    total_rating: game.total_rating ? Math.round(game.total_rating) : 0,
    hypes: game.hypes || 0,
    date: new Date(releaseDate.date * 1000).toISOString().slice(0, 10),
    platform: platformMap.get(releaseDate.platform) || null,
  };
}

export async function fetchPlatforms(platformIds) {
  const ids = platformIds.join(",");
  const body = `
    fields id,name,slug,abbreviation;
    where id = (${ids});
    limit ${platformIds.length || 20};
    sort name asc;
  `;

  const data = await igdbRequest("platforms", body);

  return data.map((platform) => ({
    id: platform.id,
    name: platform.name,
    slug: platform.slug || platform.abbreviation?.toLowerCase() || String(platform.id),
    abbreviation: platform.abbreviation || platform.name,
  }));
}

export async function fetchGames({
  startDate,
  endDate,
  platformIds,
  minHype,
  withRating,
}) {
  const startUnix = toUnixSeconds(startDate);
  const endUnix = toUnixSeconds(endDate, true);

  const releaseQuery = `
    fields id,date,game,platform;
    where date >= ${startUnix} & date <= ${endUnix} & platform = (${platformIds.join(",")}) & category = 0;
    limit 500;
    sort date asc;
  `;

  const releases = await igdbRequest("release_dates", releaseQuery);
  const gameIds = [...new Set(releases.map((release) => release.game).filter(Boolean))];

  if (!gameIds.length) {
    return [];
  }

  const platformList = await fetchPlatforms(platformIds);
  const platformMap = new Map(platformList.map((platform) => [platform.id, platform]));
  const ratingClause = withRating ? "& total_rating != null" : "";
  const hypeClause = minHype > 0 ? `& hypes >= ${minHype}` : "";

  const gamesQuery = `
    fields
      id,
      name,
      hypes,
      summary,
      storyline,
      total_rating,
      cover.url,
      artworks.url,
      videos.video_id,
      websites.url,
      genres.name,
      game_modes.name,
      involved_companies.developer,
      involved_companies.publisher,
      involved_companies.company.name;
    where id = (${gameIds.join(",")}) ${ratingClause} ${hypeClause};
    limit ${gameIds.length};
  `;

  const games = await igdbRequest("games", gamesQuery);
  const gameMap = new Map(games.map((game) => [game.id, game]));

  return releases
    .map((release) => {
      const game = gameMap.get(release.game);
      if (!game) {
        return null;
      }

      return normalizeGame(game, release, platformMap);
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.date === right.date) {
        return right.hypes - left.hypes;
      }

      return left.date.localeCompare(right.date);
    });
}
