import { useState, useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Calendar, Loader2, MessageSquare, Search, Users, X } from "lucide-react";
import { globalSearchApi } from "../../api/dashboard.api";
import useImageOk from "../../hooks/useImageOk";
import { focusRing } from "../common/ui";

// ─── Config ───────────────────────────────────────────────────
const TYPE_CONFIG = {
  club: { label: "Clubs", icon: Users },
  event: { label: "Events", icon: Calendar },
  drive: { label: "Placement drives", icon: Briefcase },
  discussion: { label: "Discussions", icon: MessageSquare },
};

const TYPE_ORDER = ["club", "event", "drive", "discussion"];

// ─── Result Row ───────────────────────────────────────────────
// An option of the results list. It is never focused itself: the input keeps
// focus and points at the highlighted option (aria-activedescendant).
const ResultRow = ({ id, result, isFocused, onNavigate, onHover }) => {
  const Icon = TYPE_CONFIG[result.type].icon;
  const [showImage, onImageError] = useImageOk(result.image);

  return (
    <li
      id={id}
      role="option"
      aria-selected={isFocused}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onNavigate(result.url)}
      onMouseEnter={onHover}
      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
        isFocused ? "bg-soft" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="grid size-8 flex-none place-items-center overflow-hidden rounded-[9px] bg-soft text-ink-2 ring-1 ring-inset ring-line-2"
      >
        {showImage ? (
          <img src={result.image} alt="" onError={onImageError} className="size-full object-cover" />
        ) : (
          <Icon size={15} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold leading-[1.3] tracking-[-0.015em] text-ink">
          {result.title}
        </span>
        {result.subtitle && (
          <span className="mt-px block truncate text-[12.5px] text-ink-2">{result.subtitle}</span>
        )}
      </span>
    </li>
  );
};

// ─── GlobalSearch ─────────────────────────────────────────────
// A combobox: type two letters or more, move through the results with the
// arrow keys, Enter opens one, Escape closes the list. Ctrl+K (⌘K) jumps here.
const GlobalSearch = () => {
  const navigate = useNavigate();
  const listId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  // ── Click outside ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Ctrl+K / ⌘K ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Debounced search ───────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setError(false);
    setFocusedIndex(-1);

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      if (query.length === 0) setIsOpen(false);
      return () => controller.abort();
    }

    setLoading(true);
    setIsOpen(true);

    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;
      try {
        const res = await globalSearchApi(query.trim(), controller.signal);
        if (controller.signal.aborted) return;
        setResults(res.data.data || []);
        setFocusedIndex(-1);
      } catch (err) {
        if (!controller.signal.aborted && err.code !== "ERR_CANCELED") {
          setResults([]);
          setFocusedIndex(-1);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // ── Group + flatten ────────────────────────────────────────
  const grouped = TYPE_ORDER.reduce((acc, t) => {
    const items = results.filter((r) => r.type === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});

  const flatResults = TYPE_ORDER.flatMap((t) => results.filter((r) => r.type === t));
  const optionId = (i) => `${listId}-option-${i}`;

  // ── Navigation ─────────────────────────────────────────────
  const handleNavigate = (url) => {
    abortRef.current?.abort();
    navigate(url);
    setIsOpen(false);
    setQuery("");
    setResults([]);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      } else if (query) {
        handleClear();
      }
      return;
    }
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      handleNavigate(flatResults[focusedIndex].url);
    }
  };

  const showDropdown = isOpen && query.trim().length >= 2;
  const showResults = showDropdown && !loading && !error && flatResults.length > 0;
  const status = !showDropdown
    ? ""
    : loading
      ? "Searching…"
      : error
        ? "Search is unavailable. Try again in a moment."
        : flatResults.length === 0
          ? "No results."
          : `${flatResults.length} ${flatResults.length === 1 ? "result" : "results"}. Use the arrow keys to move through them.`;

  return (
    <div ref={containerRef} className="relative min-w-0">
      {/* ── Input ── (max-w-full: shrinks on narrow screens, wider while in use) */}
      <div
        className={`flex h-9 w-56 max-w-full items-center gap-2 rounded-[10px] border border-line-2 px-3 transition-[width,background-color,border-color] duration-200 focus-within:border-ink-3 focus-within:ring-2 focus-within:ring-ink/10 ${
          isOpen && query ? "w-72 bg-white" : "bg-white/70 hover:border-ink-3"
        }`}
      >
        <Search size={14} className="flex-none text-ink-3" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search clubs, events, drives, and discussions"
          aria-expanded={showResults}
          aria-controls={showResults ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={showResults && focusedIndex >= 0 ? optionId(focusedIndex) : undefined}
          value={query}
          onChange={(e) => {
            abortRef.current?.abort();
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search"
          className="w-full min-w-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
        />
        {loading && <Loader2 size={13} className="flex-none animate-spin text-ink-3" aria-hidden="true" />}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className={`-m-1.5 flex-none rounded p-1.5 text-ink-3 transition-colors hover:text-ink ${focusRing}`}
          >
            <X size={13} aria-hidden="true" />
          </button>
        )}
        {!query && (
          <kbd className="hidden flex-none rounded-[5px] font-sans border border-line-2 bg-white px-[5px] py-[3px] text-[11px] font-medium leading-none text-ink-3 lg:inline">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Read out by screen readers as the results change */}
      <p role="status" className="sr-only">
        {status}
      </p>

      {/* ── Dropdown ── (phones: pinned full-width under the header) */}
      {showDropdown && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[min(520px,calc(100dvh-5rem))] w-80 flex-col overflow-hidden rounded-panel border border-line-2 bg-white shadow-panel max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto">
          {loading ? (
            <div aria-hidden="true" className="animate-pulse space-y-3 p-4">
              {[72, 56, 64].map((w) => (
                <div key={w} className="flex items-center gap-3">
                  <div className="size-8 flex-none rounded-[9px] bg-soft" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded bg-soft" style={{ width: `${w}%` }} />
                    <div className="h-2 w-1/2 rounded bg-soft" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="px-4 py-8 text-center text-[13.5px] text-ink-2">
              Search is unavailable. Try again in a moment.
            </p>
          ) : flatResults.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13.5px] text-ink-2">
              <span className="block font-semibold text-ink">No results</span>
              Try a club, an event, a company or a discussion title.
            </p>
          ) : (
            <>
              <ul id={listId} role="listbox" aria-label="Search results" className="flex-1 overflow-y-auto py-1">
                {TYPE_ORDER.map((type) => {
                  if (!grouped[type]) return null;
                  const items = grouped[type];
                  return (
                    <li key={type} role="presentation">
                      <ul role="group" aria-label={TYPE_CONFIG[type].label}>
                        <li
                          role="presentation"
                          className="sticky top-0 flex items-center justify-between bg-white/95 px-4 pb-1 pt-2.5 text-[12px] font-medium text-ink-3 backdrop-blur-sm"
                        >
                          <span>{TYPE_CONFIG[type].label}</span>
                          <span>{items.length}</span>
                        </li>
                        {items.map((result) => {
                          const flatIdx = flatResults.findIndex((r) => String(r._id) === String(result._id));
                          return (
                            <ResultRow
                              key={String(result._id)}
                              id={optionId(flatIdx)}
                              result={result}
                              isFocused={flatIdx === focusedIndex}
                              onNavigate={handleNavigate}
                              onHover={() => setFocusedIndex(flatIdx)}
                            />
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>

              {/* Footer */}
              <div
                aria-hidden="true"
                className="flex flex-none items-center justify-between border-t border-line px-4 py-2 text-[12px] text-ink-3 max-sm:hidden"
              >
                <span>
                  {flatResults.length} {flatResults.length === 1 ? "result" : "results"}
                </span>
                <span className="flex items-center gap-3">
                  {[
                    { key: "↑↓", label: "move" },
                    { key: "Enter", label: "open" },
                    { key: "Esc", label: "close" },
                  ].map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1">
                      <kbd className="rounded-[5px] border font-sans border-line-2 bg-white px-[5px] py-[2px] text-[11px] leading-none">
                        {key}
                      </kbd>
                      {label}
                    </span>
                  ))}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
