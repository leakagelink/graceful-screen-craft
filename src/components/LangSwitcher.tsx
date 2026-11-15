import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLang, type Lang } from '@/context/LangContext';

const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

export function LangSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-lg px-2.5 py-1.5 transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        {current.native}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[140px] z-50 animate-scale-in">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                l.code === lang
                  ? 'text-primary-700 bg-primary-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {l.native}
              {l.code === lang && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
