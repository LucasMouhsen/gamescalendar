import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8787),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  twitchClientId: process.env.TWITCH_CLIENT_ID || "",
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || "",
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 600000),
};

export const hasLiveCredentials =
  Boolean(config.twitchClientId) && Boolean(config.twitchClientSecret);
