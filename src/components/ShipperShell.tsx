import type { Booking } from '@/lib/supabase';
import ShipperDashboard from '@/screens/ShipperDashboard';
import ShipperRates from '@/screens/ShipperRates';
import ShipperNotifications from '@/screens/ShipperNotifications';
import ShipperAccount from '@/screens/ShipperAccount';
import { ShipperBottomNav, type ShipperTab } from '@/components/ShipperBottomNav';

interface Props {
  tab: ShipperTab;
  onTabChange: (tab: ShipperTab) => void;
  onNewBooking: () => void;
  onOpenBooking: (b: Booking) => void;
}

export default function ShipperShell({ tab, onTabChange, onNewBooking, onOpenBooking }: Props) {
  return (
    <>
      {tab === 'home' && (
        <ShipperDashboard variant="home" onNewBooking={onNewBooking} onOpenBooking={onOpenBooking} />
      )}
      {tab === 'orders' && (
        <ShipperDashboard variant="orders" onNewBooking={onNewBooking} onOpenBooking={onOpenBooking} />
      )}
      {tab === 'rates' && <ShipperRates onBook={onNewBooking} />}
      {tab === 'notifications' && <ShipperNotifications />}
      {tab === 'account' && <ShipperAccount />}
      <ShipperBottomNav active={tab} onChange={onTabChange} />
    </>
  );
}
