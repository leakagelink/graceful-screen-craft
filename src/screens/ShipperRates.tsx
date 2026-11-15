import { ArrowRight, Truck } from 'lucide-react';
import { VEHICLES, formatCurrency } from '@/lib/fare';
import { Button } from '@/components/ui';
import { useLang } from '@/context/LangContext';

interface Props {
  onBook: () => void;
}

export default function ShipperRates({ onBook }: Props) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-md mx-auto px-4 pt-6 pb-8">
          <h1 className="text-2xl font-bold">{t('rates.title')}</h1>
          <p className="text-sm text-primary-200 mt-1">
            {t('rates.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-3">
        {VEHICLES.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{v.label}</p>
                <p className="text-xs text-slate-500">
                  {v.labelHi} · {v.capacity}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">{t('rates.baseFare')}</p>
                <p className="font-bold text-slate-900">{formatCurrency(v.baseFare)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">{t('rates.perKm')}</p>
                <p className="font-bold text-slate-900">{formatCurrency(v.perKmRate)}</p>
              </div>
            </div>
          </div>
        ))}

        <Button variant="accent" className="w-full" onClick={onBook}>
          {t('rates.bookLoad')} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
