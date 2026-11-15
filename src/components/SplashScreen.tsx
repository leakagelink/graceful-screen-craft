import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

const SHOW_MS = 2000;
const FADE_MS = 500;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setExiting(true), SHOW_MS);
    const done = setTimeout(onDone, SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      aria-hidden={exiting}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800 transition-opacity duration-500 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-primary-500/30 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="animate-scale-in inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-2xl shadow-black/30">
          <Truck className="w-10 h-10 text-accent-400" strokeWidth={2.2} />
        </div>
        <h1
          className="animate-fade-in-up mt-6 text-3xl font-bold text-white tracking-tight"
          style={{ animationDelay: '150ms' }}
        >
          Vahakam Transport
        </h1>
        <p
          className="animate-fade-in-up mt-1.5 text-base text-primary-200"
          style={{ animationDelay: '250ms' }}
        >
          वाहकम ट्रान्सपोर्ट
        </p>
        <div
          className="animate-fade-in mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/15"
          style={{ animationDelay: '300ms' }}
        >
          <div className="splash-progress h-full w-1/2 rounded-full bg-accent-400" />
        </div>
      </div>
    </div>
  );
}
