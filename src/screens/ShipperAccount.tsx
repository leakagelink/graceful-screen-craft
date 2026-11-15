import { Building2, LogOut, MapPin, Phone, ReceiptText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LangSwitcher } from '@/components/LangSwitcher';
import SubscriptionCard from '@/components/SubscriptionCard';
import { useLang } from '@/context/LangContext';

export default function ShipperAccount() {
  const { t } = useLang();
  const { profile, user, signOut } = useAuth();
  const initial = (profile?.full_name ?? user?.email ?? 'S').trim().charAt(0).toUpperCase();
  const addressLine = [profile?.business_city, profile?.business_state, profile?.business_pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-xl font-bold">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-lg truncate">{profile?.full_name ?? 'Shipper'}</p>
            <p className="text-sm text-primary-200 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-3">
        {user && <SubscriptionCard shipperId={user.id} />}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          <AccountRow icon={<Building2 className="w-4 h-4" />} label={t('account.business')} value={profile?.business_name} />
          <AccountRow icon={<ReceiptText className="w-4 h-4" />} label={t('account.gstin')} value={profile?.gstin ?? t('account.notAdded')} />
          <AccountRow icon={<MapPin className="w-4 h-4" />} label={t('account.location')} value={addressLine || null} />
          <AccountRow icon={<Phone className="w-4 h-4" />} label={t('account.mobile')} value={profile?.phone} />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{t('account.language')}</p>
            <p className="text-xs text-slate-500">English, हिंदी, मराठी</p>
          </div>
          <LangSwitcher />
        </section>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> {t('account.logout')}
        </button>
      </div>
    </div>
  );
}

function AccountRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-primary-600">{icon}</span>
      <span className="text-sm text-slate-500 w-20 shrink-0">{label}</span>
      <span className="flex-1 text-sm font-semibold text-slate-900 text-right truncate">
        {value || t('account.notAdded')}
      </span>
    </div>
  );
}
