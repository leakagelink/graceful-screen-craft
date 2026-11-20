import { useCallback, useEffect, useState } from 'react';
import { Truck, Home, Route, Wallet, MessageCircle, User, Bell, RefreshCw, Download, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
import { supabase, type Booking, type Message } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, getVehicle } from '@/lib/fare';
import { driverEarnings, pickupDistance, type DriverBooking } from '@/lib/driver-data';
import { downloadDeliveryReceipt } from '@/lib/delivery-receipt';
import { getCurrentDevicePosition, getDeviceLocationErrorMessage } from '@/lib/device-location';
import DriverDashboard from '@/screens/DriverDashboard';
import DriverAccount from '@/screens/DriverAccount';
import ShipperNotifications from '@/screens/ShipperNotifications';

const tabs = [['home', 'Home', Home], ['loads', 'Loads', Truck], ['trips', 'Trips', Route], ['earnings', 'Earnings', Wallet], ['messages', 'Messages', MessageCircle], ['account', 'Account', User]] as const;
export type DriverTab = typeof tabs[number][0] | 'notifications';
export default function DriverShell({ tab, onTab, onTrip, onKyc, onChat }: { tab: DriverTab; onTab: (tab: DriverTab) => void; onTrip: (b: Booking) => void; onKyc: () => void; onChat: (id: string) => void }) {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true); setError('');
    const { data, error: failure } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (failure) setError(failure.message); else setBookings((data ?? []) as DriverBooking[]);
    if (tab === 'messages') {
      const { data: chats, error: chatError } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      if (chatError) setError(chatError.message); else setMessages((chats ?? []) as Message[]);
    }
    setLoading(false);
  }, [profile?.id, tab]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSearch(''); setFilter('all'); }, [tab]);
  async function locate() {
    setLocating(true); setError('');
    try {
      const position = await getCurrentDevicePosition();
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch (error) {
      setError(getDeviceLocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }
  async function receipt(id: string) {
    setDownloading(id); setError('');
    try { await downloadDeliveryReceipt(id); } catch (e) { setError(e instanceof Error ? e.message : 'Could not download receipt'); } finally { setDownloading(null); }
  }
  const mine = bookings.filter(b => b.driver_id === profile?.id);
  const isOnline = profile?.is_online === true;
  const available = isOnline ? bookings.filter(b => ['available', 'paid', 'offer_made'].includes(b.status)) : [];
  const summary = driverEarnings(mine);
  const source = tab === 'loads' ? available : mine;
  const shown = source.filter(b => `${b.pickup_location} ${b.drop_location} ${b.material_type}`.toLowerCase().includes(search.toLowerCase())).filter(b => {
    if (tab === 'loads' && filter !== 'all') { const distance = pickupDistance(b, coords); return distance !== null && distance <= Number(filter); }
    if (tab === 'trips' && filter === 'active') return ['assigned', 'in_progress', 'otp_sent'].includes(b.status);
    if ((tab === 'trips' && filter === 'completed') || tab === 'earnings') return ['delivered', 'completed'].includes(b.status);
    if (tab === 'trips' && filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });
  return <div className="min-h-screen bg-background text-foreground pb-24">
    {tab === 'home' ? <DriverDashboard onOpenBooking={onTrip} onOpenKyc={onKyc} /> : tab === 'account' ? <DriverAccount onKyc={onKyc} /> : tab === 'notifications' ? <ShipperNotifications /> : <>
      <header className="border-b border-border"><div className="max-w-md mx-auto px-4 py-6 flex justify-between items-center"><h1 className="text-2xl font-bold">{tabs.find(t => t[0] === tab)?.[1]}</h1><div className="flex gap-1"><Button title="Refresh" aria-label="Refresh" size="icon" variant="ghost" onClick={load}><RefreshCw /></Button><Button title="Notifications" aria-label="Notifications" size="icon" variant="ghost" onClick={() => onTab('notifications')}><Bell /></Button></div></div></header>
      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        {tab === 'earnings' && <section className="py-2 border-b border-border space-y-3"><p className="text-sm text-muted-foreground">Delivered-trip earnings</p><p className="text-3xl font-bold">{formatCurrency(summary.earned)}</p><div className="grid grid-cols-2 gap-4 pb-4"><div><p className="text-xs text-muted-foreground">Recorded payouts</p><p className="font-semibold">{formatCurrency(summary.paid)}</p></div><div><p className="text-xs text-muted-foreground">Awaiting payout</p><p className="font-semibold">{formatCurrency(Math.max(0, summary.earned - summary.paid))}</p></div></div></section>}
        {tab !== 'earnings' && <input aria-label="Search trips" placeholder="Search pickup, destination or goods" className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm" value={search} onChange={e => setSearch(e.target.value)} />}
        {tab === 'loads' && <div className="space-y-2"><Button variant="outline" onClick={locate} disabled={locating}><Navigation />{locating ? 'Locating…' : coords ? 'Update location' : 'Nearby loads'}</Button><div className="flex gap-1">{['all', '10', '25', '50'].map(value => <Button key={value} size="sm" variant={filter === value ? 'default' : 'ghost'} disabled={value !== 'all' && !coords} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : `${value} km`}</Button>)}</div></div>}
        {tab === 'trips' && <div className="flex flex-wrap gap-1">{['all', 'active', 'completed', 'cancelled'].map(value => <Button key={value} size="sm" variant={filter === value ? 'default' : 'ghost'} onClick={() => setFilter(value)} className="capitalize">{value}</Button>)}</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {tab === 'loads' && !isOnline && <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">You are offline. Go online from the Home tab to see and accept new loads. Your active trips are unaffected.</p>}
        {loading ? <div className="py-12 flex justify-center"><Spinner className="size-6" /></div> : shown.length === 0 ? <p className="py-12 text-center text-muted-foreground">{tab === 'loads' ? isOnline ? 'No matching loads' : 'New loads are hidden while you are offline' : 'No trips yet'}</p> : shown.map(b => {
          const last = messages.find(m => m.booking_id === b.id);
          const distance = pickupDistance(b, coords);
          return <article key={b.id} className="border border-border rounded-lg bg-card p-4 space-y-3">
            <div className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">#{b.id.slice(0, 8).toUpperCase()}</span><span className="capitalize text-primary">{b.status.replaceAll('_', ' ')}</span></div>
            <h2 className="font-semibold break-words">{b.pickup_location} → {b.drop_location}</h2><p className="text-xs text-muted-foreground">{getVehicle(b.vehicle_type).label} · {b.material_type} · {new Date(b.trip_date).toLocaleDateString('en-IN')}</p>
            {tab === 'messages' ? <><p className="text-sm break-words">{last?.body ?? 'No messages yet'}</p><Button variant="outline" className="w-full" onClick={() => onChat(b.id)}><MessageCircle />Open chat</Button></> : <><div className="flex justify-between items-center gap-3"><p className="font-semibold">{formatCurrency(Number(b.agreed_fare ?? b.total_fare))}</p>{tab === 'loads' && distance !== null && <span className="text-xs text-muted-foreground">{distance.toFixed(1)} km away</span>}</div>{tab === 'earnings' && <p className="text-xs text-muted-foreground">Payment: {b.payment_status} · Payout: {b.payout_status ?? 'pending'}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => onTrip(b)}>{tab === 'loads' ? 'View load / offer' : 'View trip'}</Button>{['delivered', 'completed'].includes(b.status) && <Button variant="outline" size="sm" disabled={downloading !== null} onClick={() => receipt(b.id)}><Download />{downloading === b.id ? 'Downloading…' : 'Delivery PDF'}</Button>}</div></>}
          </article>;
        })}
      </main>
    </>}
    <nav aria-label="Driver navigation" className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"><div className="max-w-md mx-auto grid grid-cols-6 h-20">{tabs.map(([id, label, Icon]) => <Button key={id} variant="ghost" aria-current={tab === id ? 'page' : undefined} onClick={() => onTab(id)} className={`h-full w-full min-w-0 flex-col gap-1 rounded-none px-0 text-[10px] ${tab === id ? 'text-primary bg-muted' : 'text-muted-foreground'}`}><Icon className="size-5" />{label}</Button>)}</div></nav>
  </div>;
}