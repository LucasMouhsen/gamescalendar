export type Platform = {
  id: number;
  name: string;
  slug: string;
  abbreviation?: string;
};

export type SimpleEntity = {
  id: number;
  name: string;
};

export type VideoItem = {
  id: number;
  video_id: string;
};

export type WebsiteItem = {
  url: string;
};

export type ImageItem = {
  id?: number;
  url: string;
};

export type Game = {
  id: number;
  name: string;
  summary: string;
  storyline: string;
  cover: ImageItem | null;
  artworks: ImageItem[];
  videos: VideoItem[];
  websites: WebsiteItem[];
  genres: SimpleEntity[];
  game_modes: SimpleEntity[];
  developer: SimpleEntity[];
  publisher: SimpleEntity[];
  total_rating: number;
  hypes: number;
  date: string;
  platform: Platform | null;
  platforms?: Platform[];
};

export type AppConfig = {
  mode: "live" | "public" | "mock" | "static";
  defaultPlatforms: number[];
  years?: number[];
  generatedAt?: string;
};
