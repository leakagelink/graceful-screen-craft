import Truck3D from '@/components/Truck3D';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Package, LogOut, Truck, Inbox, CheckCircle2, Gift, Copy, Search } from 'lucide-react';
import type { Booking } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, Spinner, Badge, inputClass } from '@/components/ui';
import { BookingCard, STATUS_META } from '@/components/BookingCard';
import { getVehicle } from '@/lib/fare';
import { LangSwitcher } from '@/components/LangSwitcher';
import { NotificationsBell } from '@/components/NotificationsBell';
import { useLang } from '@/context/LangContext';

interface Props {
  variant?: 'home' | 'orders';
  onNewBooking: () => void;
  onOpenBooking: (b: Booking) => void;
}

type Filter = 'active' | 'completed';

export default function ShipperDashboard({ variant = 'home', onNewBooking, onOpenBooking }: Props) {
  const { profile, signOut } = useAuth();
  const { t } = useLang();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isFreeTrial =
    profile?.free_until && new Date(profile.free_until) >= new Date();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error.message);
      return;
    }
    setBookings((data as Booking[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`shipper-dashboard-bookings:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const active = bookings.filter(
    (b) =>
      b.status === 'available' ||
      b.status === 'paid' ||
      b.status === 'offer_made' ||
      b.status === 'assigned' ||
      b.status === 'in_progress' ||
      b.status === 'otp_sent' ||
      b.status === 'delivered'
  );
  const completed = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );
  const shown = filter === 'active' ? active : completed;

  const filteredShown = shown.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const vehicle = getVehicle(b.vehicle_type);
    return (
      b.pickup_location.toLowerCase().includes(q) ||
      b.drop_location.toLowerCase().includes(q) ||
      b.material_type.toLowerCase().includes(q) ||
      vehicle.label.toLowerCase().includes(q) ||
      (STATUS_META[b.status]?.label ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {variant === 'home' ? (
      <>
      {/* Header */}
      <div className="hero-3d">
        <div className="max-w-md mx-auto px-4 pt-6 pb-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Package className="w-5 h-5 text-accent-300" />
              </div>
              <div>
                <p className="text-xs text-primary-200">{t('dash.welcomeBack')}</p>
                <p className="font-bold leading-tight">
                  {profile?.full_name ?? 'Shipper'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LangSwitcher />
              <NotificationsBell />
              <button
                onClick={signOut}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="-mt-1 mb-4">
            <Truck3D className="w-60" />
            <p className="text-center text-sm text-primary-200 mt-2">Apna maal bhejein — sahi truck, sahi daam</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('dash.activeBookings')} value={active.length} />
            <Stat
              label={t('dash.totalSpent')}
              value={formatINR(
                bookings
                  .filter((b) => b.status !== 'cancelled')
                  .reduce((s, b) => s + Number(b.total_fare), 0)
              )}
            />
          </div>

          {/* Referral code + free trial */}
          {profile?.referral_code && (
            <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Gift className="w-4 h-4 text-accent-300" />
                <span className="text-xs text-primary-200">Your referral code</span>
                {isFreeTrial && (
                  <span className="ml-auto text-[10px] uppercase tracking-wide bg-accent-500/30 text-accent-200 px-2 py-0.5 rounded-full font-semibold">
                    Free until {new Date(profile.free_until!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className="text-lg font-bold tracking-wider text-white flex-1">
                  {profile.referral_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(profile.referral_code!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-primary-200 mt-1.5">
                Share this code — you both get 1 month commission-free.
              </p>
            </div>
          )}
        </div>
      </div>
      </>
      ) : (
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
          <div className="max-w-md mx-auto px-4 pt-6 pb-9">
            <h1 className="text-2xl font-bold">{t('dash.myOrders')}</h1>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="max-w-md mx-auto px-4 -mt-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex p-1">
          <TabButton
            active={filter === 'active'}
            onClick={() => setFilter('active')}
          >
            {t('dash.activeTab')} ({active.length})
          </TabButton>
          <TabButton
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
          >
            {t('dash.history')} ({completed.length})
          </TabButton>
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-md mx-auto px-4 mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className={`w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-400`}
            placeholder={t('dash.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="max-w-md mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Spinner className="w-7 h-7 text-primary-500" />
            <p className="text-sm mt-3">{t('dash.loadingBookings')}</p>
          </div>
        ) : filteredShown.length === 0 ? (
          <EmptyState filter={filter} onNew={onNewBooking} hasSearch={!!searchQuery.trim()} />
        ) : (
          filteredShown.map((b, i) => (
            <div
              key={b.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <BookingCard
                booking={b}
                onClick={() => onOpenBooking(b)}
                footer={
                  b.payment_status === 'PAID' ? (
                    <Badge color="green">Payment confirmed</Badge>
                  ) : b.payment_status === 'PARTIALLY_PAID' ? (
                    <Badge color="blue">40% confirmed · 60% pending</Badge>
                  ) : b.payment_status === 'PENDING' ? (
                    <Badge color="amber">Driver confirmation pending</Badge>
                  ) : b.payment_status === 'MANUAL_PAYMENT' ? (
                    <Badge color="amber">Payment verification pending</Badge>
                  ) : b.payment_status === 'FAILED' ? (
                    <Badge color="red">Payment rejected — retry</Badge>
                  ) : b.status === 'available' ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-accent-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('dash.liveForDrivers')}
                      </span>
                      <span className="text-slate-400">{t('dash.awaitingOffers')}</span>
                    </div>
                  ) : b.status === 'offer_made' ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-primary-600 font-medium flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> {t('dash.offersReceived')}
                      </span>
                      <span className="text-slate-400">{t('dash.tapToReview')}</span>
                    </div>
                  ) : b.status === 'assigned' ? (
                    <Badge color="blue">Driver assigned</Badge>
                  ) : b.status === 'in_progress' ? (
                    <Badge color="blue">Trip in progress</Badge>
                  ) : b.status === 'otp_sent' ? (
                    <Badge color="amber">Delivery OTP sent</Badge>
                  ) : b.status === 'delivered' ? (
                    <Badge color="green">Delivered</Badge>
                  ) : null
                }
              />
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onNewBooking}
        className="fixed bottom-24 right-5 max-w-md mx-auto left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-20 flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl shadow-accent-900/30 transition-all active:scale-95"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
        <span className="font-semibold text-sm">{t('dash.newBooking')}</span>
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-3d rounded-xl px-3.5 py-2.5">
      <p className="text-xs text-primary-200">{label}</p>
      <p className="font-bold text-lg leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  filter,
  onNew,
  hasSearch,
}: {
  filter: Filter;
  onNew: () => void;
  hasSearch?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700">
        {hasSearch ? t('dash.noMatch') : filter === 'active' ? t('dash.noActive') : t('dash.noHistory')}
      </p>
      <p className="text-sm text-slate-400 mt-1 mb-5">
        {hasSearch ? t('common.tryAgain') : filter === 'active' ? t('dash.noActiveHint') : t('dash.noHistoryHint')}
      </p>
      {filter === 'active' && !hasSearch && (
        <Button variant="accent" onClick={onNew}>
          <Plus className="w-4 h-4" /> {t('dash.newBooking')}
        </Button>
      )}
    </div>
  );
}

function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}
