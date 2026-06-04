import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchConfig, fetchGames, fetchPlatforms } from "./api";
import type { AppConfig, Game, Platform } from "./types";
import {
  buildCalendarDays,
  formatDayLabel,
  formatGameDate,
  formatMonth,
  futureRange,
  groupGamesByDate,
  headlinePlatform,
  monthRange,
} from "./utils";

type ViewMode = "calendar" | "hyped";
type AppLocale = "en" | "es";

const FALLBACK_CONFIG: AppConfig = {
  mode: "public",
  defaultPlatforms: [6, 130, 167, 169, 508],
};

const TRANSLATIONS = {
  en: {
    title: "Gaming Calendar",
    subtitle: "Track upcoming game releases and discover the most hyped titles",
    calendar: "Calendar",
    mostHyped: "Most Hyped",
    viewMode: "View mode",
    language: "Language",
    english: "English",
    spanish: "Español",
    lightMode: "Switch to light mode",
    darkMode: "Switch to dark mode",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    filters: "Filters:",
    toggleFilters: "Toggle filters",
    minimumHype: "Minimum hype",
    hype: "Hype",
    platforms: "Platforms",
    withRating: "With Rating",
    hideEmpty: "Hide Empty",
    showAll: "Show All",
    listMode: "List Mode",
    reset: "Reset",
    couldNotLoad: "Could not load app data.",
    failedToLoadGames: "Game data failed to load.",
    noImage: "No Image",
    noGames: "No games",
    noSummary: "No summary available.",
    unrated: "Unrated",
    release: "Release",
    rating: "Rating",
    notRated: "Not rated",
    summary: "Summary",
    story: "Story",
    genres: "Genres",
    gameModes: "Game Modes",
    studios: "Studios",
    developer: "Developer",
    publisher: "Publisher",
    closeDialog: "Close dialog",
    lightIcon: "◐",
    darkIcon: "◑",
    previousArrow: "←",
    nextArrow: "→",
    collapse: "▴",
    expand: "▾",
    highlight: "▲",
    localeChip: "EN",
  },
  es: {
    title: "Calendario Gamer",
    subtitle: "Seguí los próximos lanzamientos y descubrí los juegos con más hype",
    calendar: "Calendario",
    mostHyped: "Más Esperados",
    viewMode: "Modo de vista",
    language: "Idioma",
    english: "English",
    spanish: "Español",
    lightMode: "Cambiar a modo claro",
    darkMode: "Cambiar a modo oscuro",
    previousMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    filters: "Filtros:",
    toggleFilters: "Mostrar u ocultar filtros",
    minimumHype: "Hype mínimo",
    hype: "Hype",
    platforms: "Plataformas",
    withRating: "Con nota",
    hideEmpty: "Ocultar vacíos",
    showAll: "Mostrar todos",
    listMode: "Modo lista",
    reset: "Reiniciar",
    couldNotLoad: "No se pudieron cargar los datos.",
    failedToLoadGames: "No se pudieron cargar los juegos.",
    noImage: "Sin imagen",
    noGames: "Sin juegos",
    noSummary: "No hay resumen disponible.",
    unrated: "Sin nota",
    release: "Lanzamiento",
    rating: "Puntuación",
    notRated: "Sin puntuar",
    summary: "Resumen",
    story: "Historia",
    genres: "Géneros",
    gameModes: "Modos de juego",
    studios: "Estudios",
    developer: "Desarrollador",
    publisher: "Publisher",
    closeDialog: "Cerrar diálogo",
    lightIcon: "◐",
    darkIcon: "◑",
    previousArrow: "←",
    nextArrow: "→",
    collapse: "▴",
    expand: "▾",
    highlight: "▲",
    localeChip: "ES",
  },
} as const;

function detectInitialLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = window.localStorage.getItem("app-locale");
  if (saved === "en" || saved === "es") {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function App() {
  const logoUrl = `${import.meta.env.BASE_URL}logo_withoutbg_400x400.png`;
  const [locale, setLocale] = useState<AppLocale>(detectInitialLocale);
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

  const text = TRANSLATIONS[locale];

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("app-locale", locale);
  }, [locale]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const nextConfig = await fetchConfig();
        setConfig(nextConfig);
        setSelectedPlatforms(nextConfig.defaultPlatforms);
        const platformList = await fetchPlatforms([]);
        setPlatforms(platformList);
      } catch (bootstrapError) {
        setError(text.couldNotLoad);
        console.error(bootstrapError);
      }
    }

    bootstrap();
  }, [text.couldNotLoad]);

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
        setError(text.failedToLoadGames);
        console.error(gamesError);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, [currentMonth, minHype, selectedPlatforms, viewMode, withRating, text.failedToLoadGames]);

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

  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

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
              <img src={logoUrl} alt={text.title} className="brand-logo-image" />
              <div>
                <h1>{text.title}</h1>
                <p>{text.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div className="view-tabs" role="tablist" aria-label={text.viewMode}>
              <button
                type="button"
                className={`tab-button ${viewMode === "calendar" ? "tab-button--calendar-active" : ""}`}
                onClick={() => setViewMode("calendar")}
              >
                {text.calendar}
              </button>
              <button
                type="button"
                className={`tab-button ${viewMode === "hyped" ? "tab-button--hyped-active" : ""}`}
                onClick={() => setViewMode("hyped")}
              >
                {text.mostHyped}
              </button>
            </div>

            <div className="locale-switcher" role="group" aria-label={text.language}>
              <button
                type="button"
                className={`locale-button ${locale === "en" ? "locale-button--active" : ""}`}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`locale-button ${locale === "es" ? "locale-button--active" : ""}`}
                onClick={() => setLocale("es")}
              >
                ES
              </button>
            </div>

            <button
              type="button"
              className="theme-toggle"
              aria-label={darkMode ? text.lightMode : text.darkMode}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? text.lightIcon : text.darkIcon}
            </button>
          </div>
        </header>

        {viewMode === "calendar" ? (
          <section className="month-nav-card">
            <div className="month-side">
              <button
                type="button"
                className="month-arrow"
                aria-label={text.previousMonth}
                onClick={() => setCurrentMonth(previousMonth)}
              >
                {text.previousArrow}
              </button>
              <span className="month-side__label">{formatMonth(previousMonth, locale)}</span>
            </div>

            <h2 className="month-title">{formatMonth(currentMonth, locale)}</h2>

            <div className="month-side month-side--right">
              <span className="month-side__label">{formatMonth(nextMonth, locale)}</span>
              <button
                type="button"
                className="month-arrow"
                aria-label={text.nextMonth}
                onClick={() => setCurrentMonth(nextMonth)}
              >
                {text.nextArrow}
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
            <span>{text.filters}</span>
            <button type="button" className="filters-expand" aria-label={text.toggleFilters}>
              {filtersExpanded ? text.collapse : text.expand}
            </button>
          </div>

          <div className={`filters-row ${filtersExpanded ? "filters-row--open" : ""}`}>
            <button type="button" className="filter-pill filter-pill--purple">
              {text.hype} ≥ {minHype}
              <input
                className="filter-range"
                type="range"
                min={0}
                max={50}
                step={1}
                value={minHype}
                onChange={(event) => setMinHype(Number(event.target.value))}
                aria-label={text.minimumHype}
              />
            </button>

            <div className="filter-platforms">
              <button type="button" className="filter-pill filter-pill--blue">
                {text.platforms} ({selectedPlatforms.length})
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
              ☆ {text.withRating}
            </button>

            <button
              type="button"
              className={`filter-pill ${hideEmptyDays ? "filter-pill--red-active" : "filter-pill--neutral"}`}
              onClick={() => setHideEmptyDays((current) => !current)}
            >
              ◉ {hideEmptyDays ? text.showAll : text.hideEmpty}
            </button>

            <button
              type="button"
              className={`filter-pill ${listMode ? "filter-pill--green-active" : "filter-pill--neutral"}`}
              onClick={() => setListMode((current) => !current)}
            >
              ☰ {text.listMode}
            </button>

            <button type="button" className="filter-pill filter-pill--neutral" onClick={resetFilters}>
              ↺ {text.reset}
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
                            {game.cover?.url ? (
                              <img src={game.cover.url} alt={game.name} />
                            ) : (
                              <div className="release-card__fallback">{text.noImage}</div>
                            )}
                            <div className="release-card__overlay" />
                            {game.hypes > 100 ? <div className="release-card__flame">{text.highlight}</div> : null}
                            <div className="release-card__text">
                              <h3>{game.name}</h3>
                              <p>{headlinePlatform(game)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {listMode ? <div className="day-footer">{formatDayLabel(day.iso, locale)}</div> : null}
                    </>
                  ) : (
                    <div className="day-empty">{text.noGames}</div>
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
                  {game.cover?.url ? <img src={game.cover.url} alt={game.name} /> : <div className="release-card__fallback">{text.noImage}</div>}
                </div>
                <div className="hyped-card__body">
                  <div className="hyped-card__top">
                    <h3>{game.name}</h3>
                    <span className="hyped-card__score">{text.hype} {game.hypes}</span>
                  </div>
                  <p>{game.summary || text.noSummary}</p>
                  <div className="hyped-card__meta">
                    <span>{headlinePlatform(game)}</span>
                    <span>{formatGameDate(game.date, locale)}</span>
                    <span>{game.total_rating ? `${game.total_rating}/100` : text.unrated}</span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {selectedGame ? <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} locale={locale} /> : null}
      </main>
    </div>
  );
}

function GameModal({
  game,
  locale,
  onClose,
}: {
  game: Game;
  locale: AppLocale;
  onClose: () => void;
}) {
  const text = TRANSLATIONS[locale];

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
              <span>{text.release} {formatGameDate(game.date, locale)}</span>
              <span>{text.hype} {game.hypes}</span>
              <span>{game.total_rating ? `${text.rating} ${game.total_rating}/100` : text.notRated}</span>
            </div>
          </div>
          <button type="button" className="modal__close" aria-label={text.closeDialog} onClick={onClose}>
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
                <h3>{text.summary}</h3>
                <p>{game.summary}</p>
              </section>
            ) : null}

            {game.storyline ? (
              <section className="modal__block">
                <h3>{text.story}</h3>
                <p>{game.storyline}</p>
              </section>
            ) : null}

            {game.genres.length ? (
              <section className="modal__block">
                <h3>{text.genres}</h3>
                <div className="pill-list">
                  {game.genres.map((genre) => (
                    <span key={genre.id}>{genre.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {game.game_modes.length ? (
              <section className="modal__block">
                <h3>{text.gameModes}</h3>
                <div className="pill-list">
                  {game.game_modes.map((mode) => (
                    <span key={mode.id}>{mode.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {game.developer.length || game.publisher.length ? (
              <section className="modal__block">
                <h3>{text.studios}</h3>
                <p>
                  {game.developer.length ? `${text.developer}: ${game.developer.map((entry) => entry.name).join(", ")}` : ""}
                  {game.developer.length && game.publisher.length ? " · " : ""}
                  {game.publisher.length ? `${text.publisher}: ${game.publisher.map((entry) => entry.name).join(", ")}` : ""}
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
