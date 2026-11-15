import { useEffect, useState, useCallback } from 'react';
import { Truck, LogOut, Wallet, MapPin, CheckCircle2, Clock, Building2, Gift, Copy, MessageCircle, ShieldCheck, RotateCcw, Search, SlidersHorizontal, Power } from 'lucide-react';
import type { Booking } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Spinner, Badge } from '@/components/ui';
import { getVehicle, formatCurrency } from '@/lib/fare';
import { calcDriverPayout } from '@/lib/commission';
import { STATUS_META } from '@/components/BookingCard';
import BankAccountModal from '@/components/BankAccountModal';
import { LangSwitcher } from '@/components/LangSwitcher';
import { NotificationsBell } from '@/components/NotificationsBell';

interface Props {
  onOpenBooking: (b: Booking) => void;
  onOpenKyc: () => void;
}

type Tab = 'available' | 'mine' | 'return';

export default function DriverDashboard({ onOpenBooking, onOpenKyc }: Props) {
  const { profile, signOut, loadProfile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('available');
  const [showBankModal, setShowBankModal] = useState(false);
  const [reloadProfile, setReloadProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'fare_high' | 'fare_low' | 'distance'>('newest');
  const [showSort, setShowSort] = useState(false);
  const [onlineToggling, setOnlineToggling] = useState(false);

  const isFreeTrial =
    profile?.free_until && new Date(profile.free_until) >= new Date();

  const bankLinked = !!(
    profile?.bank_account_number &&
    profile?.bank_ifsc &&
    profile?.bank_holder_name
  );

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
  }, [load]);

  useEffect(() => {
    if (reloadProfile && profile?.id) {
      loadProfile(profile.id);
    }
  }, [reloadProfile, profile?.id, loadProfile]);

  const available = bookings.filter((b) =>
    ['available', 'paid', 'offer_made'].includes(b.status)
  );
  const mine = bookings.filter(
    (b) => b.driver_id === profile?.id && !['available', 'paid', 'offer_made'].includes(b.status)
  );
  const myActive = mine.filter((b) =>
    ['assigned', 'in_progress', 'otp_sent', 'delivered'].includes(b.status)
  );
  const myDone = mine.filter((b) => b.status === 'completed');

  // Return loads: available loads whose pickup matches a completed trip's drop
  const completedDrops = myDone.map((b) => b.drop_location.toLowerCase());
  const returnLoads = available.filter((b) =>
    completedDrops.includes(b.pickup_location.toLowerCase())
  );

  const shown = tab === 'available' ? available : tab === 'mine' ? mine : returnLoads;

  // Filter and sort available loads
  const filteredShown = (tab === 'available' ? shown : shown).filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.pickup_location.toLowerCase().includes(q) ||
      b.drop_location.toLowerCase().includes(q) ||
      b.material_type.toLowerCase().includes(q) ||
      getVehicle(b.vehicle_type).label.toLowerCase().includes(q)
    );
  });

  const sortedShown = [...filteredShown].sort((a, b) => {
    if (sortBy === 'fare_high') return Number(b.agreed_fare ?? b.total_fare) - Number(a.agreed_fare ?? a.total_fare);
    if (sortBy === 'fare_low') return Number(a.agreed_fare ?? a.total_fare) - Number(b.agreed_fare ?? b.total_fare);
    if (sortBy === 'distance') return a.distance_km - b.distance_km;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const earnings = myDone.reduce(
    (s, b) => s + calcDriverPayout(Number(b.agreed_fare ?? b.total_fare)),
    0
  );
  const pending = myActive.reduce(
    (s, b) => s + calcDriverPayout(Number(b.agreed_fare ?? b.total_fare)),
    0
  );

  async function toggleOnline() {
    if (!profile?.id) return;
    setOnlineToggling(true);
    await supabase.from('profiles').update({ is_online: !profile.is_online }).eq('id', profile.id);
    await loadProfile(profile.id);
    setOnlineToggling(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-md mx-auto px-4 pt-6 pb-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Truck className="w-5 h-5 text-accent-300" />
              </div>
              <div>
                <p className="text-xs text-primary-200">Driver</p>
                <p className="font-bold leading-tight">
                  {profile?.full_name ?? 'Driver'}
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

          {/* Earnings card */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-accent-300" />
              <span className="text-xs text-primary-200">Your earnings</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(earnings)}
            </p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/15 text-sm">
              <div>
                <p className="text-xs text-primary-200">In progress</p>
                <p className="font-semibold text-accent-300">
                  {formatCurrency(pending)}
                </p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <p className="text-xs text-primary-200">Trips done</p>
                <p className="font-semibold">{myDone.length}</p>
              </div>
            </div>
          </div>

          {/* Online/Offline toggle */}
          {profile?.role === 'driver' && (
            <div className="mt-3 flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
              <Power className={`w-5 h-5 ${profile.is_online ? 'text-accent-300' : 'text-slate-300'}`} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">
                  {profile.is_online ? 'You are online' : 'You are offline'}
                </p>
                <p className="text-xs text-primary-200">
                  {profile.is_online ? 'Visible to shippers, receiving loads' : 'Go online to see and accept loads'}
                </p>
              </div>
              <button
                onClick={toggleOnline}
                disabled={onlineToggling}
                className={`relative w-12 h-6 rounded-full transition-colors ${profile.is_online ? 'bg-accent-500' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${profile.is_online ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}

          {/* KYC status banner */}
          {profile?.kyc_status !== 'approved' && (
            <div
              className="mt-3 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors bg-amber-500/90 hover:bg-amber-500"
              onClick={onOpenKyc}
            >
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-white" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">
                  {profile?.kyc_status === 'not_submitted' ? 'Complete your KYC' : profile?.kyc_status === 'pending' ? 'KYC under review' : 'KYC rejected — resubmit'}
                </p>
                <p className="text-xs text-white/80 truncate">Required to accept loads</p>
              </div>
            </div>
          )}

          {/* Bank account status banner */}
          <div
            className={`mt-3 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors ${
              bankLinked
                ? 'bg-white/10 hover:bg-white/15'
                : 'bg-accent-500/90 hover:bg-accent-500'
            }`}
            onClick={() => setShowBankModal(true)}
          >
            <Building2 className="w-5 h-5 flex-shrink-0 text-white" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">
                {bankLinked ? 'Bank account linked' : 'Link your bank account'}
              </p>
              <p className="text-xs text-white/80 truncate">
                {bankLinked
                  ? `${profile?.bank_holder_name} · ${profile?.bank_ifsc}`
                  : 'Required to receive trip payouts'}
              </p>
            </div>
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

      {/* Search + Sort (only on available tab) */}
      {tab === 'available' && (
        <div className="max-w-md mx-auto px-4 mt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search by location, material, vehicle…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => setShowSort(!showSort)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-primary-600"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
          {showSort && (
            <div className="bg-white border border-slate-200 rounded-xl p-2 flex gap-2 animate-fade-in">
              {(['newest', 'fare_high', 'fare_low', 'distance'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSortBy(s); setShowSort(false); }}
                  className={`flex-1 text-xs font-medium rounded-lg py-1.5 px-2 transition-colors ${
                    sortBy === s ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {s === 'newest' ? 'Newest' : s === 'fare_high' ? 'High ₹' : s === 'fare_low' ? 'Low ₹' : 'Distance'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4 -mt-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex p-1">
          <TabButton
            active={tab === 'available'}
            onClick={() => setTab('available')}
          >
            Available ({available.length})
          </TabButton>
          <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
            My Trips ({mine.length})
          </TabButton>
          <TabButton active={tab === 'return'} onClick={() => setTab('return')}>
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Return ({returnLoads.length})
          </TabButton>
        </div>
      </div>

      {/* List */}
      <div className="max-w-md mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Spinner className="w-7 h-7 text-primary-500" />
            <p className="text-sm mt-3">Loading trips…</p>
          </div>
        ) : sortedShown.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">
              {tab === 'available'
                ? 'No loads available right now'
                : tab === 'mine'
                ? 'No trips assigned to you yet'
                : 'No return loads found'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {tab === 'available'
                ? 'Check back soon — new loads appear here automatically.'
                : tab === 'mine'
                ? 'Accept a load from the Available tab to get started.'
                : 'Return loads match your completed trips drop locations. Complete more trips to see backhaul opportunities.'}
            </p>
          </div>
        ) : (
          sortedShown.map((b, i) => (
            <DriverTripCard
              key={b.id}
              booking={b}
              isMine={tab === 'mine'}
              onClick={() => onOpenBooking(b)}
              delay={i * 40}
            />
          ))
        )}
      </div>

      {showBankModal && (
        <BankAccountModal
          onClose={() => setShowBankModal(false)}
          onSaved={() => {
            setShowBankModal(false);
            setReloadProfile((r) => !r);
          }}
        />
      )}
    </div>
  );
}

function DriverTripCard({
  booking,
  isMine,
  onClick,
  delay,
}: {
  booking: Booking;
  isMine: boolean;
  onClick: () => void;
  delay: number;
}) {
  const vehicle = getVehicle(booking.vehicle_type);
  const status = STATUS_META[booking.status] ?? STATUS_META['available'];
  const tripDate = new Date(booking.trip_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  const earnings = calcDriverPayout(Number(booking.agreed_fare ?? booking.total_fare));
  const isActive = ['assigned', 'in_progress', 'otp_sent', 'delivered'].includes(booking.status);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all active:scale-[0.99] animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">
              {vehicle.label}
            </p>
            <p className="text-xs text-slate-400">
              {booking.material_type} · {tripDate}
            </p>
          </div>
        </div>
        {isMine && <Badge color={status.color}>{status.label}</Badge>}
      </div>

      <div className="flex items-start gap-2 mb-3">
        <div className="flex flex-col items-center pt-1">
          <span className="w-2 h-2 rounded-full bg-accent-500" />
          <span className="w-0.5 h-6 bg-slate-200 my-0.5" />
          <span className="w-2 h-2 rounded-full bg-error-500" />
        </div>
        <div className="flex-1 min-w-0 text-sm space-y-1.5">
          <p className="text-slate-900 font-medium truncate">
            <MapPin className="w-3 h-3 inline text-accent-500 mr-1" />
            {booking.pickup_location}
          </p>
          <p className="text-slate-600 truncate">
            <MapPin className="w-3 h-3 inline text-error-500 mr-1" />
            {booking.drop_location}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between pt-3 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400">
            {isMine ? 'You will earn' : 'Trip earnings'}
          </p>
          <p className="text-xl font-bold text-accent-600">
            {formatCurrency(earnings)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {booking.distance_km} km trip
          </p>
        </div>

        {isMine ? (
          isActive ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg px-3 py-2">
              <Clock className="w-3.5 h-3.5" /> Tap to manage trip
            </div>
          ) : (
            <Badge color="green">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </Badge>
          )
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-600 bg-accent-50 rounded-lg px-3 py-2">
            Accept / Make Offer
          </div>
        )}
      </div>

      {isMine && isActive && (
        <div className="mt-3 flex items-center justify-between text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {status.label}
          </span>
          {['assigned', 'in_progress', 'otp_sent', 'delivered'].includes(booking.status) && (
            <span className="flex items-center gap-1 text-primary-500">
              <MessageCircle className="w-3 h-3" /> Chat available
            </span>
          )}
        </div>
      )}
    </button>
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
