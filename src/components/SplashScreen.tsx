import { useEffect, useState } from 'react';
import Truck3D from '@/components/Truck3D';

const SHOW_MS = 2400;
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
      className={`hero-3d fixed inset-0 z-50 flex flex-col items-center justify-center !rounded-none transition-opacity duration-500 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center w-full max-w-sm px-6">
        <p className="animate-fade-in text-xs uppercase tracking-[0.35em] text-accent-300">India ka truck network</p>
        <div className="animate-scale-in w-full mt-4">
          <Truck3D className="w-72 max-w-full" />
        </div>
        <h1 className="animate-fade-in-up mt-6 text-4xl font-bold text-white" style={{ animationDelay: '150ms' }}>
          Vahakam
        </h1>
        <p className="animate-fade-in-up mt-1 text-base text-primary-200" style={{ animationDelay: '250ms' }}>
          वाहकम ट्रान्सपोर्ट
        </p>
        <div className="animate-fade-in mt-10 w-48 overflow-hidden rounded-full" style={{ animationDelay: '300ms' }}>
          <div className="road-line" />
        </div>
      </div>
    </div>
  );
}
