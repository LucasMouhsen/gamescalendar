import cors from "cors";
import express from "express";
import { config, hasLiveCredentials } from "./config.js";
import { fetchGames, fetchPlatforms } from "./igdb.js";
import { fetchPublicGames, fetchPublicPlatforms } from "./public-source.js";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
  }),
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    mode: hasLiveCredentials ? "live" : "mock",
  });
});

app.get("/api/config", (_request, response) => {
  response.json({
    mode: hasLiveCredentials ? "live" : "public",
    defaultPlatforms: [6, 130, 167, 169, 508],
  });
});

app.post("/api/platforms", async (request, response) => {
  try {
    const platformIds = Array.isArray(request.body.platform_ids)
      ? request.body.platform_ids.map(Number)
      : [];

    const data = hasLiveCredentials
      ? await fetchPlatforms(platformIds)
      : await fetchPublicPlatforms(platformIds);

    response.json(data);
  } catch (error) {
    response.status(500).json({
      error: "Failed to load platforms",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/games", async (request, response) => {
  try {
    const {
      start_date: startDate,
      end_date: endDate,
      platform_ids: platformIds = [],
      hypes = 0,
      score = false,
    } = request.body ?? {};

    if (!startDate || !endDate) {
      return response.status(400).json({
        error: "start_date and end_date are required",
      });
    }

    const params = {
      startDate,
      endDate,
      platformIds: platformIds.map(Number),
      minHype: Number(hypes || 0),
      withRating: Boolean(score),
    };

    const data = hasLiveCredentials ? await fetchGames(params) : await fetchPublicGames(params);

    return response.json(data);
  } catch (error) {
    return response.status(500).json({
      error: "Failed to load games",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(config.port, () => {
  console.log(`GameCalendar backend running on http://localhost:${config.port}`);
  console.log(`Mode: ${hasLiveCredentials ? "live" : "mock"}`);
});
