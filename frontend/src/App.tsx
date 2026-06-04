import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchConfig, fetchGames, fetchPlatforms } from "./api";
import type { AppConfig, Game, Platform } from "./types";
import {
  buildCalendarDays,
  formatDayLabel,
  formatMonth,
  futureRange,
  groupGamesByDate,
  headlinePlatform,
  monthRange,
} from "./utils";

type ViewMode = "calendar" | "hyped";

const FALLBACK_CONFIG: AppConfig = {
  mode: "public",
  defaultPlatforms: [6, 130, 167, 169, 508],
};

function App() {
  const logoUrl = `${import.meta.env.BASE_URL}logo_withoutbg_400x400.png`;
  const [config, setConfig] = useState<AppConfig>(FALLBACK_CONFIG);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(FALLBACK_CONFIG.defaultPlatforms);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [minHype, setMinHype] = useState(0);
  const [withRating, setWithRating] = useState(false);
  const [hideEmptyDays, setHideEmptyDays] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const nextConfig = await fetchConfig();
        setConfig(nextConfig);
        setSelectedPlatforms(nextConfig.defaultPlatforms);
        const platformList = await fetchPlatforms([]);
        setPlatforms(platformList);
      } catch (bootstrapError) {
        setError("Could not load app data.");
        console.error(bootstrapError);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedPlatforms.length) {
      return;
    }

    async function loadGames() {
      setLoading(true);
      setError("");

      try {
        const range = viewMode === "calendar" ? monthRange(currentMonth) : futureRange(4);
        const data = await fetchGames({
          startDate: range.startDate,
          endDate: range.endDate,
          platformIds: selectedPlatforms,
          minHype,
          withRating,
        });

        const nextGames =
          viewMode === "hyped"
            ? [...data].sort((left, right) => {
                if (left.hypes === right.hypes) {
                  return left.date.localeCompare(right.date);
                }
                return right.hypes - left.hypes;
              })
            : data;

        setGames(nextGames);
      } catch (gamesError) {
        setError("Game data failed to load.");
        console.error(gamesError);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, [currentMonth, minHype, selectedPlatforms, viewMode, withRating]);

  const groupedGames = useMemo(() => groupGamesByDate(games), [games]);
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const visibleDays = useMemo(() => {
    if (!hideEmptyDays && !listMode) {
      return calendarDays;
    }
    return calendarDays.filter((day) => (groupedGames[day.iso] || []).length > 0);
  }, [calendarDays, groupedGames, hideEmptyDays, listMode]);

  const sortedPlatforms = useMemo(() => {
    const selected = platforms.filter((platform) => selectedPlatforms.includes(platform.id));
    const rest = platforms.filter((platform) => !selectedPlatforms.includes(platform.id));
    return [...selected, ...rest];
  }, [platforms, selectedPlatforms]);

  const resetFilters = () => {
    setSelectedPlatforms(config.defaultPlatforms);
    setMinHype(0);
    setWithRating(false);
    setHideEmptyDays(false);
    setListMode(false);
  };

  const togglePlatform = (platformId: number) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId],
    );
  };

  return (
    <div className="app-shell">
      <main className="calendar-layout">
        <header className={`header-card ${viewMode === "hyped" ? "header-card--hyped" : ""}`}>
          <div className="header-copy">
            <div className="brand-row">
              <img
                src={logoUrl}
                alt="Logo"
                className="brand-logo-image"
              />
              <div>
                <h1>Gaming Calendar</h1>
                <p>Track upcoming game releases and discover the most hyped titles</p>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div className="view-tabs" role="tablist" aria-label="View mode">
              <button
                type="button"
                className={`tab-button ${viewMode === "calendar" ? "tab-button--calendar-active" : ""}`}
                onClick={() => setViewMode("calendar")}
              >
                Calendar
              </button>
              <button
                type="button"
                className={`tab-button ${viewMode === "hyped" ? "tab-button--hyped-active" : ""}`}
                onClick={() => setViewMode("hyped")}
              >
                Most Hyped
              </button>
            </div>

            <button
              type="button"
              className="theme-toggle"
              aria-label={darkMode ? "Passer au mode clair" : "Passer au mode sombre"}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? "◐" : "◑"}
            </button>
          </div>
        </header>

        {viewMode === "calendar" ? (
          <section className="month-nav-card">
            <div className="month-side">
              <button type="button" className="month-arrow" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                ←
              </button>
              <span className="month-side__label">
                {formatMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              </span>
            </div>

            <h2 className="month-title">{formatMonth(currentMonth)}</h2>

            <div className="month-side month-side--right">
              <span className="month-side__label">
                {formatMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              </span>
              <button type="button" className="month-arrow" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                →
              </button>
            </div>
          </section>
        ) : null}

        <section className="filters-card">
          <div
            className="filters-heading"
            onClick={() => setFiltersExpanded((current) => !current)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFiltersExpanded((current) => !current);
              }
            }}
          >
            <span>Filters:</span>
            <button type="button" className="filters-expand" aria-label="Toggle filters">
              {filtersExpanded ? "▴" : "▾"}
            </button>
          </div>

          <div className={`filters-row ${filtersExpanded ? "filters-row--open" : ""}`}>
            <button type="button" className="filter-pill filter-pill--purple">
              ↗ Hype ≥ {minHype}
              <input
                className="filter-range"
                type="range"
                min={0}
                max={50}
                step={1}
                value={minHype}
                onChange={(event) => setMinHype(Number(event.target.value))}
                aria-label="Minimum hype"
              />
            </button>

            <div className="filter-platforms">
              <button type="button" className="filter-pill filter-pill--blue">
                ▽ Plateforms ({selectedPlatforms.length})
              </button>
              <div className="platform-menu">
                {sortedPlatforms.map((platform) => {
                  const active = selectedPlatforms.includes(platform.id);
                  return (
                    <label key={platform.id} className={`platform-option ${active ? "platform-option--active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => togglePlatform(platform.id)}
                      />
                      <span>{platform.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className={`filter-pill ${withRating ? "filter-pill--yellow-active" : "filter-pill--neutral"}`}
              onClick={() => setWithRating((current) => !current)}
            >
              ☆ With Rating
            </button>

            <button
              type="button"
              className={`filter-pill ${hideEmptyDays ? "filter-pill--red-active" : "filter-pill--neutral"}`}
              onClick={() => setHideEmptyDays((current) => !current)}
            >
              ◉ {hideEmptyDays ? "Show All" : "Hide Empty"}
            </button>

            <button
              type="button"
              className={`filter-pill ${listMode ? "filter-pill--green-active" : "filter-pill--neutral"}`}
              onClick={() => setListMode((current) => !current)}
            >
              ☰ List Mode
            </button>

            <button type="button" className="filter-pill filter-pill--neutral" onClick={resetFilters}>
              ↺ Reset
            </button>
          </div>
        </section>

        {error ? <div className="status-error">{error}</div> : null}

        {loading ? (
          <section className="skeleton-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="skeleton-card" />
            ))}
          </section>
        ) : viewMode === "calendar" ? (
          <section className={`calendar-grid ${listMode ? "calendar-grid--list" : ""}`}>
            {visibleDays.map((day) => {
              const dayGames = groupedGames[day.iso] || [];
              return (
                <article
                  key={day.iso}
                  className={`day-card ${day.iso === todayIso ? "day-card--today" : ""} ${!dayGames.length ? "day-card--empty" : ""}`}
                >
                  <div className="day-badge">{day.day}</div>
                  {dayGames.length ? (
                    <>
                      <div className="game-carousel">
                        {dayGames.map((game) => (
                          <button
                            key={`${game.id}-${game.platform?.id ?? "na"}`}
                            type="button"
                            className="release-card"
                            onClick={() => setSelectedGame(game)}
                          >
                            {game.cover?.url ? <img src={game.cover.url} alt={game.name} /> : <div className="release-card__fallback">No Image</div>}
                            <div className="release-card__overlay" />
                            {game.hypes > 100 ? <div className="release-card__flame">▲</div> : null}
                            <div className="release-card__text">
                              <h3>{game.name}</h3>
                              <p>{headlinePlatform(game)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {listMode ? <div className="day-footer">{formatDayLabel(day.iso)}</div> : null}
                    </>
                  ) : (
                    <div className="day-empty">No games</div>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="hyped-column">
            {games.map((game) => (
              <button
                key={`${game.id}-${game.platform?.id ?? "na"}`}
                type="button"
                className="hyped-card"
                onClick={() => setSelectedGame(game)}
              >
                <div className="hyped-card__cover">
                  {game.cover?.url ? <img src={game.cover.url} alt={game.name} /> : <div className="release-card__fallback">No Image</div>}
                </div>
                <div className="hyped-card__body">
                  <div className="hyped-card__top">
                    <h3>{game.name}</h3>
                    <span className="hyped-card__score">Hype {game.hypes}</span>
                  </div>
                  <p>{game.summary || "No summary available."}</p>
                  <div className="hyped-card__meta">
                    <span>{headlinePlatform(game)}</span>
                    <span>{game.date}</span>
                    <span>{game.total_rating ? `${game.total_rating}/100` : "Unrated"}</span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {selectedGame ? <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} /> : null}
      </main>
    </div>
  );
}

function GameModal({
  game,
  onClose,
}: {
  game: Game;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h2 id="modal-title" className="modal__title">
              {game.name}
            </h2>
            <div className="modal__meta">
              <span>{headlinePlatform(game)}</span>
              <span>Release {game.date}</span>
              <span>Hype {game.hypes}</span>
              <span>{game.total_rating ? `Rating ${game.total_rating}/100` : "Not rated"}</span>
            </div>
          </div>
          <button type="button" className="modal__close" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal__columns">
          <div className="modal__cover">
            {game.cover?.url ? <img src={game.cover.url.replace("t_cover_big", "t_1080p")} alt={game.name} /> : null}
          </div>
          <div className="modal__content">
            {game.summary ? (
              <section className="modal__block">
                <h3>Summary</h3>
                <p>{game.summary}</p>
              </section>
            ) : null}

            {game.storyline ? (
              <section className="modal__block">
                <h3>Story</h3>
                <p>{game.storyline}</p>
              </section>
            ) : null}

            {game.genres.length ? (
              <section className="modal__block">
                <h3>Genres</h3>
                <div className="pill-list">
                  {game.genres.map((genre) => (
                    <span key={genre.id}>{genre.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {game.game_modes.length ? (
              <section className="modal__block">
                <h3>Game Modes</h3>
                <div className="pill-list">
                  {game.game_modes.map((mode) => (
                    <span key={mode.id}>{mode.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {game.developer.length || game.publisher.length ? (
              <section className="modal__block">
                <h3>Studios</h3>
                <p>
                  {game.developer.length ? `Developer: ${game.developer.map((entry) => entry.name).join(", ")}` : ""}
                  {game.developer.length && game.publisher.length ? " · " : ""}
                  {game.publisher.length ? `Publisher: ${game.publisher.map((entry) => entry.name).join(", ")}` : ""}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
