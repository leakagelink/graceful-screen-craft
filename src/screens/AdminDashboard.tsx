// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Truck,
  Wallet,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  TrendingUp,
} from 'lucide-react';
import { supabase, type Profile, type Booking, type Dispute, type KycStatus, type AppSettings } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Badge, Spinner, inputClass, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/fare';
import { getVehicle } from '@/lib/fare';
import { calcCommissionFromSecondHalf } from '@/lib/commission';
import { STATUS_META } from '@/components/BookingCard';
import { LangSwitcher } from '@/components/LangSwitcher';
import { Settings as SettingsIcon } from 'lucide-react';
import { PAYMENT_STATUS_LABELS } from '@/lib/payment-config';

import ShipperSubscriptionAdmin from '@/components/ShipperSubscriptionAdmin';

type Tab = 'overview' | 'users' | 'kyc' | 'bookings' | 'payments' | 'disputes' | 'subscriptions' | 'settings';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pData }, { data: bData }, { data: dData }, { data: sData }, { data: rData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('disputes').select('*').order('created_at', { ascending: false }),
      supabase.from('app_settings').select('*').eq('id', 'default').maybeSingle(),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (pData) {
      const roleByUser = new Map((rData ?? []).map((r) => [r.user_id, r.role]));
      setProfiles(pData.map((p) => ({ ...p, role: roleByUser.get(p.id) ?? null })) as Profile[]);
    }
    if (bData) setBookings(bData as Booking[]);
    if (dData) setDisputes(dData as Dispute[]);
    if (sData) setAppSettings(sData as AppSettings);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const drivers = profiles.filter((p) => p.role === 'driver');
  const shippers = profiles.filter((p) => p.role === 'shipper');
  const pendingKyc = drivers.filter((p) => p.kyc_status === 'pending');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const totalCommission = completedBookings.reduce(
    (s, b) => s + Number(b.commission_amount ?? calcCommissionFromSecondHalf(Number(b.agreed_fare ?? b.total_fare))),
    0
  );
  const totalRevenue = completedBookings.reduce((s, b) => s + Number(b.agreed_fare ?? b.total_fare), 0);
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'investigating');

  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? '').includes(search) ||
      (p.id ?? '').includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-gradient-to-br from-primary-800 to-primary-950 text-white">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent-300" />
              </div>
              <div>
                <p className="text-xs text-primary-200">Admin Panel</p>
                <p className="font-bold leading-tight">Vahakam Transport</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LangSwitcher />
              <button onClick={signOut} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <AdminStat label="Users" value={profiles.length} icon={<Users className="w-3.5 h-3.5" />} />
            <AdminStat label="Bookings" value={bookings.length} icon={<Truck className="w-3.5 h-3.5" />} />
            <AdminStat label="Commission" value={formatCurrency(totalCommission)} icon={<Wallet className="w-3.5 h-3.5" />} />
            <AdminStat label="Disputes" value={openDisputes.length} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex p-1 overflow-x-auto">
          {(['overview', 'users', 'kyc', 'bookings', 'payments', 'disputes', 'subscriptions', 'settings'] as Tab[]).map((t) => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>
              {t === 'kyc' && pendingKyc.length > 0 ? `${t} (${pendingKyc.length})` : t}
            </TabBtn>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Spinner className="w-7 h-7 text-primary-500" />
            <p className="text-sm mt-3">Loading…</p>
          </div>
        ) : tab === 'overview' ? (
          <OverviewTab
            shippers={shippers.length}
            drivers={drivers.length}
            pendingKyc={pendingKyc.length}
            totalBookings={bookings.length}
            completedBookings={completedBookings.length}
            totalRevenue={totalRevenue}
            totalCommission={totalCommission}
            openDisputes={openDisputes.length}
          />
        ) : tab === 'users' ? (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input className={`${inputClass} pl-11`} placeholder="Search by name, phone, or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filteredProfiles.map((p) => (
              <UserRow key={p.id} profile={p} />
            ))}
          </>
        ) : tab === 'subscriptions' ? (
          <ShipperSubscriptionAdmin />
        ) : tab === 'kyc' ? (
          pendingKyc.length === 0 ? (
            <EmptyBox icon={<ShieldCheck className="w-8 h-8" />} text="No pending KYC reviews" />
          ) : (
            pendingKyc.map((p) => <KycReviewCard key={p.id} profile={p} onAction={load} />)
          )
        ) : tab === 'bookings' ? (
          bookings.map((b) => <BookingRow key={b.id} booking={b} />)
        ) : tab === 'payments' ? (
          <PaymentsTab bookings={bookings} onAction={load} />
        ) : tab === 'disputes' ? (
          disputes.length === 0 ? (
            <EmptyBox icon={<AlertTriangle className="w-8 h-8" />} text="No disputes reported" />
          ) : (
            disputes.map((d) => <DisputeRow key={d.id} dispute={d} onAction={load} />)
          )
        ) : tab === 'settings' ? (
          <SettingsTab settings={appSettings} onAction={load} />
        ) : null}
      </div>
    </div>
  );
}

function OverviewTab({ shippers, drivers, pendingKyc, totalBookings, completedBookings, totalRevenue, totalCommission, openDisputes }: {
  shippers: number; drivers: number; pendingKyc: number; totalBookings: number; completedBookings: number; totalRevenue: number; totalCommission: number; openDisputes: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card label="Shippers" value={shippers} icon={<Users className="w-4 h-4 text-primary-600" />} />
      <Card label="Drivers" value={drivers} icon={<Truck className="w-4 h-4 text-primary-600" />} />
      <Card label="Pending KYC" value={pendingKyc} icon={<ShieldCheck className="w-4 h-4 text-amber-600" />} />
      <Card label="Total bookings" value={totalBookings} icon={<Truck className="w-4 h-4 text-primary-600" />} />
      <Card label="Completed" value={completedBookings} icon={<CheckCircle2 className="w-4 h-4 text-accent-600" />} />
      <Card label="Open disputes" value={openDisputes} icon={<AlertTriangle className="w-4 h-4 text-error-600" />} />
      <div className="col-span-2 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-accent-300" />
          <h3 className="font-bold text-sm">Revenue Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-primary-200">Total transaction value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-primary-200">Platform commission (2.5%)</p>
            <p className="text-2xl font-bold text-accent-300">{formatCurrency(totalCommission)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({ profile }: { profile: Profile }) {
  const kycBadge = profile.role === 'driver' ? (
    <Badge color={profile.kyc_status === 'approved' ? 'green' : profile.kyc_status === 'pending' ? 'amber' : profile.kyc_status === 'rejected' ? 'red' : 'slate'}>
      {profile.kyc_status}
    </Badge>
  ) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900 text-sm truncate">{profile.full_name}</p>
          <Badge color={profile.role === 'admin' ? 'red' : profile.role === 'driver' ? 'blue' : 'slate'}>{profile.role}</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{profile.phone ?? 'No phone'} · {new Date(profile.created_at).toLocaleDateString('en-IN')}</p>
      </div>
      {kycBadge}
    </div>
  );
}

function KycReviewCard({ profile, onAction }: { profile: Profile; onAction: () => void }) {
  const [busy, setBusy] = useState(false);

  async function review(status: KycStatus, reason?: string) {
    setBusy(true);
    await supabase.from('profiles').update({
      kyc_status: status,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_rejection_reason: reason ?? null,
    }).eq('id', profile.id);
    setBusy(false);
    onAction();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-900 text-sm">{profile.full_name}</p>
          <p className="text-xs text-slate-400">{profile.phone ?? 'No phone'}</p>
        </div>
        <Badge color="amber">Pending</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><p className="text-slate-400">License #</p><p className="font-medium text-slate-700">{profile.license_number ?? '—'}</p></div>
        <div><p className="text-slate-400">RC #</p><p className="font-medium text-slate-700">{profile.rc_number ?? '—'}</p></div>
        <div><p className="text-slate-400">Vehicle #</p><p className="font-medium text-slate-700">{profile.vehicle_number ?? '—'}</p></div>
      </div>
      <div className="flex gap-2 pt-2">
        {profile.license_url && <DocLink label="License" url={profile.license_url} />}
        {profile.rc_url && <DocLink label="RC" url={profile.rc_url} />}
        {profile.insurance_url && <DocLink label="Insurance" url={profile.insurance_url} />}
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="accent" size="sm" className="flex-1" onClick={() => review('approved')} disabled={busy}>
          <CheckCircle2 className="w-4 h-4" /> Approve
        </Button>
        <Button variant="danger" size="sm" className="flex-1" onClick={() => review('rejected', 'Documents could not be verified')} disabled={busy}>
          <XCircle className="w-4 h-4" /> Reject
        </Button>
      </div>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-center text-xs font-semibold text-primary-700 bg-primary-50 rounded-lg py-2 hover:bg-primary-100 transition-colors">
      View {label}
    </a>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const vehicle = getVehicle(booking.vehicle_type);
  const status = STATUS_META[booking.status] ?? STATUS_META['available'];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-slate-900 text-sm">{vehicle.label} · {booking.pickup_location} → {booking.drop_location}</p>
        <Badge color={status.color}>{status.label}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{booking.material_type} · {booking.distance_km} km</span>
        <span className="font-bold text-primary-700">{formatCurrency(Number(booking.agreed_fare ?? booking.total_fare))}</span>
      </div>
    </div>
  );
}

function PaymentsTab({ bookings, onAction }: { bookings: Booking[]; onAction: () => void }) {
  const paymentBookings = bookings.filter(
    (b) => b.payment_status && b.payment_status !== 'NOT_REQUIRED' && b.status !== 'cancelled'
  );
  const pendingVerification = paymentBookings.filter(
    (b) => b.payment_status === 'MANUAL_PAYMENT' || b.payment_status === 'PENDING'
  );

  return (
    <div className="space-y-3">
      {pendingVerification.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <p className="font-semibold">{pendingVerification.length} payment(s) awaiting verification</p>
          <p className="text-xs mt-0.5">Review and confirm manual payments below.</p>
        </div>
      )}
      {paymentBookings.length === 0 ? (
        <EmptyBox icon={<Wallet className="w-8 h-8" />} text="No payment records yet" />
      ) : (
        paymentBookings.map((b) => (
          <PaymentRow key={b.id} booking={b} onAction={onAction} />
        ))
      )}
    </div>
  );
}

function PaymentRow({ booking, onAction }: { booking: Booking; onAction: () => void }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const commission = Number(booking.commission_amount ?? calcCommissionFromSecondHalf(Number(booking.agreed_fare ?? booking.total_fare)));
  const fare = Number(booking.agreed_fare ?? booking.total_fare);

  async function verifyPayment(status: 'PAID' | 'FAILED') {
    setBusy(true);
    await supabase.from('bookings').update({
      payment_status: status,
      payment_verified_by: profile?.id,
      payment_verified_at: new Date().toISOString(),
      payout_1_status: status === 'PAID' ? 'paid' : booking.payout_1_status,
      payout_2_status: status === 'PAID' ? 'paid' : booking.payout_2_status,
    }).eq('id', booking.id);
    setBusy(false);
    onAction();
  }

  const statusColor =
    booking.payment_status === 'PAID' ? 'green' :
    booking.payment_status === 'FAILED' ? 'red' :
    booking.payment_status === 'REFUNDED' ? 'slate' :
    'amber';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900 text-sm">{booking.pickup_location} → {booking.drop_location}</p>
        <Badge color={statusColor}>{PAYMENT_STATUS_LABELS[booking.payment_status] ?? booking.payment_status}</Badge>
      </div>
      <div className="space-y-1 text-xs">
        <Row label="Fare" value={formatCurrency(fare)} />
        <Row label="Commission (5% of 2nd half)" value={formatCurrency(commission)} color="text-error-600" />
        <Row label="Method" value={booking.payment_method ?? '—'} />
        {booking.payment_verified_at && (
          <Row label="Verified" value={new Date(booking.payment_verified_at).toLocaleDateString('en-IN')} />
        )}
      </div>
      {(booking.payment_status === 'MANUAL_PAYMENT' || booking.payment_status === 'PENDING') && (
        <div className="flex gap-2 pt-2">
          <Button variant="accent" size="sm" className="flex-1" onClick={() => verifyPayment('PAID')} disabled={busy}>
            <CheckCircle2 className="w-4 h-4" /> Mark Paid
          </Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={() => verifyPayment('FAILED')} disabled={busy}>
            <XCircle className="w-4 h-4" /> Mark Failed
          </Button>
        </div>
      )}
    </div>
  );
}

function DisputeRow({ dispute, onAction }: { dispute: Dispute; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState('');

  async function resolve(status: 'resolved' | 'dismissed') {
    setBusy(true);
    await supabase.from('disputes').update({
      status,
      resolution: resolution || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', dispute.id);
    setBusy(false);
    onAction();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Badge color={dispute.status === 'open' ? 'red' : dispute.status === 'resolved' ? 'green' : 'slate'}>{dispute.status}</Badge>
        <span className="text-xs text-slate-400">{new Date(dispute.created_at).toLocaleDateString('en-IN')}</span>
      </div>
      <p className="text-sm text-slate-700">{dispute.reason}</p>
      {dispute.resolution && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">Resolution: {dispute.resolution}</p>}
      {(dispute.status === 'open' || dispute.status === 'investigating') && (
        <>
          <input className={inputClass} placeholder="Resolution notes…" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="accent" size="sm" className="flex-1" onClick={() => resolve('resolved')} disabled={busy}>Resolve</Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => resolve('dismissed')} disabled={busy}>Dismiss</Button>
          </div>
        </>
      )}
    </div>
  );
}

function AdminStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-2.5">
      <p className="text-xs text-primary-200 flex items-center gap-1">{icon} {label}</p>
      <p className="font-bold text-lg leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-slate-500 font-medium">{label}</p></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium ${color ?? 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function EmptyBox({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-700 text-sm">{text}</p>
    </div>
  );
}

function SettingsTab({ settings, onAction }: { settings: AppSettings | null; onAction: () => void }) {
  const { profile } = useAuth();
  const [otpLength, setOtpLength] = useState(settings?.trip_otp_length ?? 6);
  const [commissionRate, setCommissionRate] = useState(settings ? Number(settings.commission_rate) * 100 : 5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('app_settings').upsert({
      id: 'default',
      trip_otp_length: Math.max(4, Math.min(8, otpLength)),
      commission_rate: Math.max(0, Math.min(1, commissionRate / 100)),
      updated_at: new Date().toISOString(),
      updated_by: profile?.id,
    });
    setBusy(false);
    if (error) {
      setMsg({ type: 'error', text: 'Could not save settings.' });
      return;
    }
    setMsg({ type: 'success', text: 'Settings saved successfully.' });
    onAction();
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-slate-900 text-sm">App Configuration</h3>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Trip OTP Length</label>
          <input
            type="number"
            min={4}
            max={8}
            className={inputClass}
            value={otpLength}
            onChange={(e) => setOtpLength(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1">Number of digits in the delivery verification OTP (4–8).</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Commission Rate (% of second half)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            className={inputClass}
            value={commissionRate}
            onChange={(e) => setCommissionRate(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1">
            Applied to the second 50% of the trip fare. Default 5% means 2.5% of total fare goes to Vahakam.
          </p>
        </div>

        {msg && (
          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-error-500/10 text-error-700'}`}>
            {msg.text}
          </div>
        )}

        <Button variant="primary" className="w-full" onClick={save} disabled={busy} loading={busy}>
          Save Settings
        </Button>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">Integration Points (configure later)</p>
        <p>• Payment Gateway: Razorpay edge function at <code className="text-primary-600">/functions/v1/razorpay-order</code></p>
        <p>• Messaging/WhatsApp: Notification table ready, add webhook in edge function</p>
        <p>• Push Notifications: Notification table + <code className="text-primary-600">NotificationsBell</code> component ready</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}
