import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchConfig, fetchGames, fetchPlatforms } from "./api";
import type { AppConfig, Game, Platform } from "./types";
import {
  buildCalendarDays,
  formatDayLabel,
  formatGameDate,
  formatMonth,
  formatMonthName,
  futureRangeToYear,
  groupGamesByDate,
  headlinePlatform,
  localizedGameGenres,
  localizedGameModes,
  localizedGameName,
  localizedGameStoryline,
  localizedGameSummary,
  monthRange,
} from "./utils";

type ViewMode = "calendar" | "hyped";
type AppLocale = "en" | "es";
type StoredPreferences = {
  locale: AppLocale;
  darkMode: boolean;
  viewMode: ViewMode;
  currentMonth: string;
  minHype: number;
  withRating: boolean;
  hideEmptyDays: boolean;
  listMode: boolean;
  selectedPlatforms: number[];
  selectedGenres: number[];
};

const FALLBACK_CONFIG: AppConfig = {
  mode: "static",
  defaultPlatforms: [6, 130, 167, 169, 508],
};

const PREFERENCES_KEY = "gamecalendar-preferences";

const TRANSLATIONS = {
  en: {
    title: "Gaming Calendar",
    subtitle: "Track upcoming game releases and discover the most hyped titles",
    calendar: "Calendar",
    mostHyped: "Most Hyped",
    viewMode: "View mode",
    language: "Language",
    english: "English",
    spanish: "Espa\u00f1ol",
    lightMode: "Switch to light mode",
    darkMode: "Switch to dark mode",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    filters: "Filters",
    moreFilters: "More",
    toggleFilters: "Toggle filters",
    minimumHype: "Minimum hype",
    hype: "Hype",
    month: "Month",
    year: "Year",
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
    currentMonth: "Current month",
    previousGame: "Previous game",
    nextGame: "Show next game",
    lightIcon: "\u2600",
    darkIcon: "\u263d",
    previousArrow: "\u2190",
    nextArrow: "\u2192",
    collapse: "\u25b4",
    expand: "\u25be",
    highlight: "\u25b2",
    ratingIcon: "\u2606",
    visibilityIcon: "\u25c9",
    listIcon: "\u2630",
    resetIcon: "\u21ba",
  },
  es: {
    title: "Calendario Gamer",
    subtitle: "Segu\u00ed los pr\u00f3ximos lanzamientos y descubr\u00ed los juegos con m\u00e1s hype",
    calendar: "Calendario",
    mostHyped: "M\u00e1s Esperados",
    viewMode: "Modo de vista",
    language: "Idioma",
    english: "English",
    spanish: "Espa\u00f1ol",
    lightMode: "Cambiar a modo claro",
    darkMode: "Cambiar a modo oscuro",
    previousMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    filters: "Filtros",
    moreFilters: "M\u00e1s",
    toggleFilters: "Mostrar u ocultar filtros",
    minimumHype: "Hype m\u00ednimo",
    hype: "Hype",
    month: "Mes",
    year: "A\u00f1o",
    platforms: "Plataformas",
    withRating: "Con nota",
    hideEmpty: "Ocultar vac\u00edos",
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
    rating: "Puntuaci\u00f3n",
    notRated: "Sin puntuar",
    summary: "Resumen",
    story: "Historia",
    genres: "G\u00e9neros",
    gameModes: "Modos de juego",
    studios: "Estudios",
    developer: "Desarrollador",
    publisher: "Editor",
    closeDialog: "Cerrar di\u00e1logo",
    currentMonth: "Mes actual",
    previousGame: "Juego anterior",
    nextGame: "Ver siguiente juego",
    lightIcon: "\u2600",
    darkIcon: "\u263d",
    previousArrow: "\u2190",
    nextArrow: "\u2192",
    collapse: "\u25b4",
    expand: "\u25be",
    highlight: "\u25b2",
    ratingIcon: "\u2606",
    visibilityIcon: "\u25c9",
    listIcon: "\u2630",
    resetIcon: "\u21ba",
  },
} as const;

const DEFAULT_PREFERENCES: StoredPreferences = {
  locale: "en",
  darkMode: true,
  viewMode: "calendar",
  currentMonth: new Date().toISOString(),
  minHype: 0,
  withRating: false,
  hideEmptyDays: false,
  listMode: false,
  selectedPlatforms: [],
  selectedGenres: [],
};

function loadPreferences(): StoredPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      selectedPlatforms: Array.isArray(parsed.selectedPlatforms) ? parsed.selectedPlatforms.map(Number) : [],
      selectedGenres: Array.isArray(parsed.selectedGenres) ? parsed.selectedGenres.map(Number) : [],
      locale: parsed.locale === "es" ? "es" : "en",
      viewMode: parsed.viewMode === "hyped" ? "hyped" : "calendar",
      currentMonth:
        typeof parsed.currentMonth === "string" && !Number.isNaN(new Date(parsed.currentMonth).valueOf())
          ? parsed.currentMonth
          : DEFAULT_PREFERENCES.currentMonth,
      darkMode: parsed.darkMode !== undefined ? Boolean(parsed.darkMode) : DEFAULT_PREFERENCES.darkMode,
      minHype: Number(parsed.minHype || 0),
      withRating: Boolean(parsed.withRating),
      hideEmptyDays: Boolean(parsed.hideEmptyDays),
      listMode: Boolean(parsed.listMode),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function detectInitialLocale(): AppLocale {
  const saved = loadPreferences().locale;
  if (saved === "en" || saved === "es") {
    return saved;
  }

  if (typeof window === "undefined") {
    return "en";
  }

  return window.navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function App() {
  const logoUrl = `${import.meta.env.BASE_URL}logo_withoutbg_400x400.png`;
  const initialPreferences = loadPreferences();
  const [locale, setLocale] = useState<AppLocale>(detectInitialLocale);
  const [config, setConfig] = useState<AppConfig>(FALLBACK_CONFIG);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(
    initialPreferences.selectedPlatforms.length
      ? initialPreferences.selectedPlatforms
      : FALLBACK_CONFIG.defaultPlatforms,
  );
  const [selectedGenres, setSelectedGenres] = useState<number[]>(initialPreferences.selectedGenres);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(initialPreferences.currentMonth));
  const [viewMode, setViewMode] = useState<ViewMode>(initialPreferences.viewMode);
  const [minHype, setMinHype] = useState(initialPreferences.minHype);
  const [withRating, setWithRating] = useState(initialPreferences.withRating);
  const [hideEmptyDays, setHideEmptyDays] = useState(initialPreferences.hideEmptyDays);
  const [listMode, setListMode] = useState(initialPreferences.listMode);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(initialPreferences.darkMode);
  const [loadedGames, setLoadedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [activeGameByDay, setActiveGameByDay] = useState<Record<string, number>>({});

  const text = TRANSLATIONS[locale];

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        locale,
        darkMode,
        viewMode,
        currentMonth: currentMonth.toISOString(),
        minHype,
        withRating,
        hideEmptyDays,
        listMode,
        selectedPlatforms,
        selectedGenres,
      } satisfies StoredPreferences),
    );
  }, [
    currentMonth,
    darkMode,
    hideEmptyDays,
    listMode,
    locale,
    minHype,
    selectedGenres,
    selectedPlatforms,
    viewMode,
    withRating,
  ]);

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [selectedGame]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const nextConfig = await fetchConfig();
        setConfig(nextConfig);
        setSelectedPlatforms((current) => (current.length ? current : nextConfig.defaultPlatforms));
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
        const latestConfiguredYear = config.years?.length
          ? Math.max(...config.years)
          : new Date().getFullYear() + 2;
        const range =
          viewMode === "hyped"
            ? futureRangeToYear(latestConfiguredYear)
            : monthRange(currentMonth);
        const data = await fetchGames({
          startDate: range.startDate,
          endDate: range.endDate,
          platformIds: selectedPlatforms,
          minHype,
          withRating,
        });
        setLoadedGames(data);
      } catch (gamesError) {
        setError(text.failedToLoadGames);
        console.error(gamesError);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, [config.years, currentMonth, minHype, selectedPlatforms, text.failedToLoadGames, viewMode, withRating]);

  const availableGenres = useMemo(() => {
    const genreMap = new Map<number, { id: number; name: string }>();

    for (const game of loadedGames) {
      for (const genre of localizedGameGenres(game, locale)) {
        if (!genreMap.has(genre.id)) {
          genreMap.set(genre.id, genre);
        }
      }
    }

    return [...genreMap.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [loadedGames, locale]);

  const games = useMemo(() => {
    const filtered = loadedGames.filter((game) => {
      if (!selectedGenres.length) {
        return true;
      }

      const gameGenreIds = game.genres.map((genre) => genre.id);
      return selectedGenres.some((genreId) => gameGenreIds.includes(genreId));
    });

    if (viewMode !== "hyped") {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      if (left.hypes === right.hypes) {
        return left.date.localeCompare(right.date);
      }
      return right.hypes - left.hypes;
    });
  }, [loadedGames, selectedGenres, viewMode]);

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

  const sortedGenres = useMemo(() => {
    const selected = availableGenres.filter((genre) => selectedGenres.includes(genre.id));
    const rest = availableGenres.filter((genre) => !selectedGenres.includes(genre.id));
    return [...selected, ...rest];
  }, [availableGenres, selectedGenres]);

  const availableYears = useMemo(() => {
    const configYears = config.years?.length ? config.years : [];
    const currentYear = new Date().getFullYear();
    const loadedYears = loadedGames
      .map((game) => Number(game.date.slice(0, 4)))
      .filter((year) => !Number.isNaN(year));
    const mergedYears = new Set([currentYear, currentMonth.getFullYear(), ...configYears, ...loadedYears]);
    return [...mergedYears].sort((left, right) => left - right);
  }, [config.years, currentMonth, loadedGames]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => ({
        value: monthIndex,
        label: formatMonthName(monthIndex, locale),
      })),
    [locale],
  );

  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const currentCalendarMonth = new Date();
  const isCurrentMonth =
    currentMonth.getFullYear() === currentCalendarMonth.getFullYear() &&
    currentMonth.getMonth() === currentCalendarMonth.getMonth();

  const resetFilters = () => {
    setSelectedPlatforms(config.defaultPlatforms);
    setSelectedGenres([]);
    setMinHype(0);
    setWithRating(false);
    setHideEmptyDays(false);
    setListMode(false);
  };

  const togglePlatform = (platformId: number) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId) ? current.filter((id) => id !== platformId) : [...current, platformId],
    );
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((current) =>
      current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId],
    );
  };

  const setCurrentMonthPart = (nextYear: number, nextMonthIndex: number) => {
    setCurrentMonth(new Date(nextYear, nextMonthIndex, 1));
  };

  const cycleDayGame = (dayIso: string, total: number, direction: -1 | 1) => {
    setActiveGameByDay((current) => {
      const currentIndex = current[dayIso] ?? 0;
      const nextIndex = (currentIndex + direction + total) % total;
      return {
        ...current,
        [dayIso]: nextIndex,
      };
    });
  };

  const selectDayGame = (dayIso: string, index: number) => {
    setActiveGameByDay((current) => ({
      ...current,
      [dayIso]: index,
    }));
  };

  return (
    <div className="app-shell">
      <main className={`calendar-layout ${viewMode === "hyped" ? "calendar-layout--scrollable" : ""}`}>
        <header className={`header-card ${viewMode === "hyped" ? "header-card--hyped" : ""}`}>
          <div className="header-copy">
            <div className="brand-row">
              <img
                src={logoUrl}
                alt={text.title}
                className="brand-logo-image"
                width={64}
                height={64}
                fetchPriority="high"
              />
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
                role="tab"
                aria-selected={viewMode === "calendar"}
              >
                {text.calendar}
              </button>
              <button
                type="button"
                className={`tab-button ${viewMode === "hyped" ? "tab-button--hyped-active" : ""}`}
                onClick={() => setViewMode("hyped")}
                role="tab"
                aria-selected={viewMode === "hyped"}
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
              title={darkMode ? text.lightMode : text.darkMode}
              onClick={() => setDarkMode((current) => !current)}
            >
              <span aria-hidden="true">{darkMode ? text.lightIcon : text.darkIcon}</span>
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
                <span aria-hidden="true">{text.previousArrow}</span>
              </button>
              <span className="month-side__label">{formatMonth(previousMonth, locale)}</span>
            </div>

            <div className="month-center">
              <h2 className="month-title">{formatMonth(currentMonth, locale)}</h2>
            </div>

            <div className="month-side month-side--right">
              <span className="month-side__label">{formatMonth(nextMonth, locale)}</span>
              <button
                type="button"
                className="month-arrow"
                aria-label={text.nextMonth}
                onClick={() => setCurrentMonth(nextMonth)}
              >
                <span aria-hidden="true">{text.nextArrow}</span>
              </button>
            </div>
          </section>
        ) : null}

        <section className="filters-card">
          <button
            type="button"
            className="filters-heading"
            onClick={() => setFiltersExpanded((current) => !current)}
            aria-expanded={filtersExpanded}
            aria-controls="filters-panel"
            aria-label={text.toggleFilters}
          >
            <span>{text.filters}</span>
            <span className="filters-expand" aria-hidden="true">
              {filtersExpanded ? text.collapse : text.expand}
            </span>
          </button>

          <div id="filters-panel" className={`filters-row ${filtersExpanded ? "filters-row--open" : ""}`}>
            <label className="filter-pill filter-pill--purple filter-pill--range">
              <span>
                {text.hype} &ge; {minHype}
              </span>
              <input
                className="filter-range"
                type="range"
                name="minHype"
                min={0}
                max={50}
                step={1}
                value={minHype}
                onChange={(event) => setMinHype(Number(event.target.value))}
                aria-label={text.minimumHype}
              />
            </label>

            <details className="filter-menu">
              <summary className="filter-pill filter-pill--blue filter-menu__trigger">
                {text.platforms} ({selectedPlatforms.length})
              </summary>
              <div className="platform-menu">
                {sortedPlatforms.map((platform) => {
                  const active = selectedPlatforms.includes(platform.id);
                  return (
                    <label key={platform.id} className={`platform-option ${active ? "platform-option--active" : ""}`}>
                      <input type="checkbox" checked={active} onChange={() => togglePlatform(platform.id)} />
                      <span>{platform.name}</span>
                    </label>
                  );
                })}
              </div>
            </details>

            <button
              type="button"
              className={`filter-pill ${withRating ? "filter-pill--yellow-active" : "filter-pill--neutral"}`}
              onClick={() => setWithRating((current) => !current)}
            >
              <span aria-hidden="true">{text.ratingIcon}</span>
              {text.withRating}
            </button>

            <button
              type="button"
              className={`filter-pill ${hideEmptyDays ? "filter-pill--red-active" : "filter-pill--neutral"}`}
              onClick={() => setHideEmptyDays((current) => !current)}
            >
              <span aria-hidden="true">{text.visibilityIcon}</span>
              {hideEmptyDays ? text.showAll : text.hideEmpty}
            </button>

            <button
              type="button"
              className={`filter-pill ${listMode ? "filter-pill--green-active" : "filter-pill--neutral"}`}
              onClick={() => setListMode((current) => !current)}
            >
              <span aria-hidden="true">{text.listIcon}</span>
              {text.listMode}
            </button>

            <button type="button" className="filter-pill filter-pill--neutral" onClick={resetFilters}>
              <span aria-hidden="true">{text.resetIcon}</span>
              {text.reset}
            </button>

            <details className="filter-menu filter-menu--secondary">
              <summary className="filter-pill filter-pill--neutral filter-menu__trigger">
                {text.moreFilters}
              </summary>
              <div className="platform-menu platform-menu--wide">
                {viewMode === "calendar" ? (
                  <div className="filter-stack">
                    <button
                      type="button"
                      className={`filter-pill filter-pill--neutral ${isCurrentMonth ? "month-today--disabled" : ""}`}
                      onClick={() => setCurrentMonth(currentCalendarMonth)}
                      disabled={isCurrentMonth}
                    >
                      {text.currentMonth}
                    </button>

                    <label className="filter-select-group">
                      <span className="filter-select-label">{text.month}</span>
                      <select
                        className="filter-select"
                        name="month"
                        value={currentMonth.getMonth()}
                        onChange={(event) => setCurrentMonthPart(currentMonth.getFullYear(), Number(event.target.value))}
                        aria-label={text.month}
                      >
                        {monthOptions.map((monthOption) => (
                          <option key={monthOption.value} value={monthOption.value}>
                            {monthOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="filter-select-group">
                      <span className="filter-select-label">{text.year}</span>
                      <select
                        className="filter-select"
                        name="year"
                        value={currentMonth.getFullYear()}
                        onChange={(event) => setCurrentMonthPart(Number(event.target.value), currentMonth.getMonth())}
                        aria-label={text.year}
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                <div className="filter-stack filter-stack--full">
                  <span className="filter-select-label">
                    {text.genres} ({selectedGenres.length})
                  </span>
                  <div className="platform-menu__list">
                    {sortedGenres.map((genre) => {
                      const active = selectedGenres.includes(genre.id);
                      return (
                        <label key={genre.id} className={`platform-option ${active ? "platform-option--active" : ""}`}>
                          <input type="checkbox" checked={active} onChange={() => toggleGenre(genre.id)} />
                          <span>{genre.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </details>
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
              const activeIndex = dayGames.length ? Math.min(activeGameByDay[day.iso] ?? 0, dayGames.length - 1) : 0;
              const activeGame = dayGames[activeIndex] ?? null;

              return (
                <article
                  key={day.iso}
                  className={`day-card ${day.iso === todayIso ? "day-card--today" : ""} ${!dayGames.length ? "day-card--empty" : ""} ${dayGames.length > 1 ? "day-card--multi" : ""}`}
                >
                  <div className="day-badge">{day.day}</div>
                  {activeGame ? (
                    <>
                      <div className="game-carousel">
                        <button
                          key={`${activeGame.id}-${activeGame.platform?.id ?? "na"}`}
                          type="button"
                          className="release-card"
                          onClick={() => setSelectedGame(activeGame)}
                        >
                          <div className="release-card__media">
                            {activeGame.cover?.url ? (
                              <img
                                src={activeGame.cover.url}
                                alt={localizedGameName(activeGame, locale)}
                                width={264}
                                height={374}
                                loading="lazy"
                              />
                            ) : (
                              <div className="release-card__fallback">{text.noImage}</div>
                            )}
                            <div className="release-card__overlay" />
                            {activeGame.hypes > 100 ? (
                              <div className="release-card__flame" aria-hidden="true">
                                {text.highlight}
                              </div>
                            ) : null}
                            <div className="release-card__text">
                              <h3>{localizedGameName(activeGame, locale)}</h3>
                              <p>{headlinePlatform(activeGame)}</p>
                            </div>
                          </div>
                        </button>
                      </div>
                      {dayGames.length > 1 ? (
                        <div className="day-switcher">
                          <button
                            type="button"
                            className="day-switcher__hit day-switcher__hit--prev"
                            aria-label={text.previousGame}
                            onClick={() => cycleDayGame(day.iso, dayGames.length, -1)}
                          >
                            <span aria-hidden="true">{text.previousArrow}</span>
                          </button>
                          <div className="day-switcher__dots">
                            {dayGames.map((game, index) => (
                              <button
                                key={`${day.iso}-${game.id}-${index}`}
                                type="button"
                                className={`day-switcher__dot ${index === activeIndex ? "day-switcher__dot--active" : ""}`}
                                aria-label={`${localizedGameName(game, locale)} (${index + 1}/${dayGames.length})`}
                                onClick={() => selectDayGame(day.iso, index)}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            className="day-switcher__hit day-switcher__hit--next"
                            aria-label={text.nextGame}
                            onClick={() => cycleDayGame(day.iso, dayGames.length, 1)}
                          >
                            <span aria-hidden="true">{text.nextArrow}</span>
                          </button>
                        </div>
                      ) : null}
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
                  {game.cover?.url ? (
                    <img
                      src={game.cover.url}
                      alt={localizedGameName(game, locale)}
                      width={320}
                      height={180}
                      loading="lazy"
                    />
                  ) : (
                    <div className="release-card__fallback">{text.noImage}</div>
                  )}
                </div>
                <div className="hyped-card__body">
                  <div className="hyped-card__top">
                    <h3>{localizedGameName(game, locale)}</h3>
                    <span className="hyped-card__score">
                      {text.hype} {game.hypes}
                    </span>
                  </div>
                  <p>{localizedGameSummary(game, locale) || text.noSummary}</p>
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
              {localizedGameName(game, locale)}
            </h2>
            <div className="modal__meta">
              <span>{headlinePlatform(game)}</span>
              <span>
                {text.release} {formatGameDate(game.date, locale)}
              </span>
              <span>
                {text.hype} {game.hypes}
              </span>
              <span>{game.total_rating ? `${text.rating} ${game.total_rating}/100` : text.notRated}</span>
            </div>
          </div>
          <button type="button" className="modal__close" aria-label={text.closeDialog} onClick={onClose}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="modal__columns">
          <div className="modal__cover">
            {game.cover?.url ? (
              <img
                src={game.cover.url.replace("t_cover_big", "t_1080p")}
                alt={localizedGameName(game, locale)}
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="modal__content">
            {localizedGameSummary(game, locale) ? (
              <section className="modal__block">
                <h3>{text.summary}</h3>
                <p>{localizedGameSummary(game, locale)}</p>
              </section>
            ) : null}

            {localizedGameStoryline(game, locale) ? (
              <section className="modal__block">
                <h3>{text.story}</h3>
                <p>{localizedGameStoryline(game, locale)}</p>
              </section>
            ) : null}

            {localizedGameGenres(game, locale).length ? (
              <section className="modal__block">
                <h3>{text.genres}</h3>
                <div className="pill-list">
                  {localizedGameGenres(game, locale).map((genre) => (
                    <span key={genre.id}>{genre.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {localizedGameModes(game, locale).length ? (
              <section className="modal__block">
                <h3>{text.gameModes}</h3>
                <div className="pill-list">
                  {localizedGameModes(game, locale).map((mode) => (
                    <span key={mode.id}>{mode.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {game.developer.length || game.publisher.length ? (
              <section className="modal__block">
                <h3>{text.studios}</h3>
                <p>
                  {game.developer.length
                    ? `${text.developer}: ${game.developer.map((entry) => entry.name).join(", ")}`
                    : ""}
                  {game.developer.length && game.publisher.length ? " \u00b7 " : ""}
                  {game.publisher.length
                    ? `${text.publisher}: ${game.publisher.map((entry) => entry.name).join(", ")}`
                    : ""}
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
