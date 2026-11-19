import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Loader2, Search, MapPin, X } from 'lucide-react';
import { CITIES, searchCities, type City } from '@/lib/cities';
import { searchPlaces } from '@/lib/routing';
import { inputClass } from '@/components/ui';

interface Props {
  label: string;
  value: string;
  onChange: (value: string, city?: City) => void;
  placeholder?: string;
  accentColor?: 'accent' | 'error';
  excludeName?: string;
}

function baseName(name: string) {
  return name.split(',')[0]?.trim().toLowerCase() ?? '';
}

function isExcluded(name: string, excludeName?: string) {
  if (!excludeName?.trim()) return false;
  return name.trim().toLowerCase() === excludeName.trim().toLowerCase()
    || baseName(name) === baseName(excludeName);
}

export default function CityAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  accentColor = 'accent',
  excludeName,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [remoteResults, setRemoteResults] = useState<City[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const listId = useId();

  useEffect(() => {
    requestIdRef.current += 1;
    setQuery(value);
    setRemoteResults([]);
    setSearching(false);
    setSearchError(false);
  }, [value]);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  const results = useMemo(() => {
    const local = searchCities(query).filter((city) => !isExcluded(city.name, excludeName));
    const localNames = new Set(local.map((city) => baseName(city.name)));
    const remote = remoteResults.filter(
      (city) => !isExcluded(city.name, excludeName) && !localNames.has(baseName(city.name)),
    );
    return [...local, ...remote].slice(0, 10);
  }, [query, excludeName, remoteResults]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(city: City) {
    requestIdRef.current += 1;
    setSearching(false);
    setQuery(city.name);
    onChange(city.name, city);
    setRemoteResults([]);
    setOpen(false);
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    requestIdRef.current += 1;
    setQuery(next);
    setRemoteResults([]);
    setSearching(false);
    setSearchError(false);
    onChange(next, undefined);
    setOpen(true);
  }

  function clear() {
    requestIdRef.current += 1;
    setQuery('');
    setRemoteResults([]);
    setSearching(false);
    setSearchError(false);
    onChange('', undefined);
    setOpen(true);
  }

  async function runRemoteSearch() {
    const searchQuery = query.trim();
    if (searchQuery.length < 2 || searching) return;
    const requestId = ++requestIdRef.current;
    setSearching(true);
    setSearchError(false);
    setRemoteResults([]);
    setOpen(true);
    try {
      const places = await searchPlaces(searchQuery);
      if (requestId !== requestIdRef.current) return;
      setRemoteResults(places.map((place, index) => ({
        id: `live-${place.lat}-${place.lng}-${index}`,
        name: place.label,
        nameHi: 'Live location · India',
        lat: place.lat,
        lng: place.lng,
      })));
    } catch {
      if (requestId === requestIdRef.current) setSearchError(true);
    } finally {
      if (requestId === requestIdRef.current) setSearching(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setHighlight((current) => Math.min(current + 1, results.length - 1));
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[Math.min(highlight, results.length - 1)];
      if (selected) pick(selected);
      else void runRemoteSearch();
    }
  }

  const dotColor = accentColor === 'accent' ? 'text-accent-500' : 'text-error-500';
  const showIndiaSearch = query.trim().length >= 2 && !searching && remoteResults.length === 0 && !searchError;

  return (
    <div ref={wrapRef} className="relative">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 ${dotColor}`} />
        <input
          className={`${inputClass} pl-11 pr-10`}
          placeholder={placeholder}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          autoComplete="off"
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-500" />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            aria-label={`Clear ${label}`}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
        )}
      </div>

      {open && (results.length > 0 || searching || searchError || showIndiaSearch) && (
        <div
          id={listId}
          className="absolute z-30 mt-1 w-full animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {results.length > 0 && (
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {results.map((city, index) => (
                <li key={city.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlight}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(city)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                      index === highlight ? 'bg-primary-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{city.name}</p>
                      <p className="truncate text-xs text-slate-400">{city.nameHi}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searching && (
            <div role="status" className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              Searching “{query.trim()}” across India…
            </div>
          )}

          {searchError && (
            <div role="alert" className="px-3 py-3 text-sm text-slate-500">
              <p>Live search is unavailable right now. Try again or pin the location on the map.</p>
              <button type="button" onClick={() => void runRemoteSearch()} className="mt-2 font-semibold text-primary-600">
                Retry all-India search
              </button>
            </div>
          )}

          {showIndiaSearch && (
            <button
              type="button"
              onClick={() => void runRemoteSearch()}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 bg-primary-50/60 px-3 py-3 text-left text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                Search all India for “<span className="break-words">{query.trim()}</span>”
                <span className="mt-0.5 block text-xs font-normal text-primary-600">or press Enter</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { CITIES };
