import { Home, ClipboardList, IndianRupee, Bell, UserRound, type LucideIcon } from 'lucide-react';

import { useLang } from '@/context/LangContext';

export type ShipperTab = 'home' | 'orders' | 'rates' | 'notifications' | 'account';

const TABS: { id: ShipperTab; labelKey: string; icon: LucideIcon }[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'orders', labelKey: 'nav.orders', icon: ClipboardList },
  { id: 'rates', labelKey: 'nav.rates', icon: IndianRupee },
  { id: 'notifications', labelKey: 'nav.alerts', icon: Bell },
  { id: 'account', labelKey: 'nav.account', icon: UserRound },
];

interface Props {
  active: ShipperTab;
  onChange: (tab: ShipperTab) => void;
}

export function ShipperBottomNav({ active, onChange }: Props) {
  const { t } = useLang();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map(({ id, labelKey, icon: Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] transition-colors ${
                  isActive ? 'text-primary-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full bg-accent-500 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <span
                  className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                    isActive ? 'bg-primary-100' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {t(labelKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
