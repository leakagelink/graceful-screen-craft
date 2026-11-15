import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, ShieldAlert, X } from 'lucide-react';
import { GOODS_TYPES, RESTRICTED_ITEMS } from '@/lib/booking-options';
import { Button } from '@/components/ui';

interface Props {
  selected: string;
  onSelect: (goods: string) => void;
  onClose: () => void;
}

export default function GoodsTypeSheet({ selected, onSelect, onClose }: Props) {
  const [choice, setChoice] = useState(selected);
  const [showRestricted, setShowRestricted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select goods type"
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-5 pb-6 animate-fade-in-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Select Goods Type</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-4">
          <button
            onClick={() => setShowRestricted((v) => !v)}
            className="w-full flex items-center gap-3 text-left"
            aria-expanded={showRestricted}
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">Restricted Items</span>
              <span className="block text-xs text-slate-600">Narcotics, explosives and more</span>
            </span>
            <span className="text-xs font-semibold text-primary-700 flex items-center gap-1">
              See All
              {showRestricted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {showRestricted && (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700 pl-12 list-disc marker:text-amber-600">
              {RESTRICTED_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {GOODS_TYPES.map((goods) => {
            const active = choice === goods;
            return (
              <li key={goods}>
                <button
                  onClick={() => setChoice(goods)}
                  className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all ${
                    active
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {goods}
                  {active && <Check className="w-5 h-5 text-primary-600 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="pt-4">
          <Button className="w-full" disabled={!choice} onClick={() => onSelect(choice)}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
