import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <Loader2 className={`animate-spin ${className}`} strokeWidth={2.5} />
  );
}

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-primary-950">
      <Spinner className="w-9 h-9 text-accent-400" />
      <p className="text-primary-100 text-sm">{label}</p>
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm shadow-primary-900/20',
    accent:
      'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm shadow-accent-900/20',
    secondary:
      'bg-white text-primary-700 border border-primary-200 hover:bg-primary-50 active:bg-primary-100',
    ghost:
      'bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
    danger:
      'bg-error-500 text-white hover:bg-error-600 active:bg-error-600 shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-sm rounded-xl',
    lg: 'px-5 py-3.5 text-base rounded-xl',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-xs text-slate-400 mt-1">{hint}</span>
      )}
      {error && (
        <span className="block text-xs text-error-600 mt-1 font-medium">
          {error}
        </span>
      )}
    </label>
  );
}

export const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-base';

export function Badge({
  children,
  color = 'slate',
}: {
  children: React.ReactNode;
  color?: 'slate' | 'blue' | 'green' | 'amber' | 'red';
}) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-primary-100 text-primary-700',
    green: 'bg-accent-100 text-accent-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]}`}
    >
      {children}
    </span>
  );
}
