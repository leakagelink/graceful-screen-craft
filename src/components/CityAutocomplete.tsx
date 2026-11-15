// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { CITIES, searchCities, type City } from '@/lib/cities';
import { inputClass } from '@/components/ui';

interface Props {
  label: string;
  value: string;
  onChange: (value: string, city?: City) => void;
  placeholder?: string;
  accentColor?: 'accent' | 'error';
  excludeName?: string;
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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const results = useMemo(() => {
    const list = searchCities(query);
    return excludeName
      ? list.filter((c) => c.name.toLowerCase() !== excludeName.toLowerCase())
      : list;
  }, [query, excludeName]);

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

  function pick(c: City) {
    setQuery(c.name);
    onChange(c.name, c);
    setOpen(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v, undefined);
    setOpen(true);
  }

  function clear() {
    setQuery('');
    onChange('', undefined);
    setOpen(true);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const dotColor = accentColor === 'accent' ? 'text-accent-500' : 'text-error-500';

  return (
    <div ref={wrapRef} className="relative">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${dotColor}`} />
        <input
          className={`${inputClass} pl-11 pr-10`}
          placeholder={placeholder}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto animate-fade-in">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(c)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                  i === highlight ? 'bg-primary-50' : 'hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.nameHi}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-3 text-sm text-slate-400 animate-fade-in">
          No matching Maharashtra city. You can still type any place name — we'll
          route it on the road network.
        </div>
      )}
    </div>
  );
}

export { CITIES };
