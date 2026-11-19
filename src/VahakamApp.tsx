// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useCallback, useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { Button, FullPageLoader } from '@/components/ui';
import SplashScreen from '@/components/SplashScreen';
import AuthScreen from '@/screens/AuthScreen';
import BookingForm from '@/screens/BookingForm';
import BookingSummary from '@/screens/BookingSummary';
import ShipperTripDetail from '@/screens/ShipperTripDetail';
import ChatScreen from '@/screens/ChatScreen';
import AdminDashboard from '@/screens/AdminDashboard';
import ShipperShell from '@/components/ShipperShell';
import DriverShell, { type DriverTab } from '@/components/DriverShell';
import DriverTripDetail from '@/screens/DriverTripDetail';
import KycScreen from '@/screens/KycScreen';
import ShipperProfileSetup from '@/screens/ShipperProfileSetup';
import type { ShipperTab } from '@/components/ShipperBottomNav';
import type { Booking } from '@/lib/supabase';
import { useAppBackNavigation } from '@/hooks/use-app-back-navigation';

type ShipperView =
  | { name: 'dashboard' }
  | { name: 'newBooking' }
  | { name: 'summary'; booking: Booking; justCreated?: boolean }
  | { name: 'tripDetail'; booking: Booking }
  | { name: 'chat'; bookingId: string };

type DriverView =
  | { name: 'home' }
  | { name: 'kyc' }
  | { name: 'trip'; booking: Booking }
  | { name: 'chat'; bookingId: string };

interface NavigationSnapshot {
  view: ShipperView;
  tab: ShipperTab;
  driverTab: DriverTab;
  driverView: DriverView;
}

function AppRoutes() {
  const { user, profile, loading, registrationRequired } = useAuth();
  const [view, setView] = useState<ShipperView>({ name: 'dashboard' });
  const [tab, setTab] = useState<ShipperTab>('home');
  const [driverTab, setDriverTab] = useState<DriverTab>('home');
  const [driverView, setDriverView] = useState<DriverView>({ name: 'home' });

  const restore = useCallback((snapshot: NavigationSnapshot) => {
    setView(snapshot.view);
    setTab(snapshot.tab);
    setDriverTab(snapshot.driverTab);
    setDriverView(snapshot.driverView);
  }, []);
  const { navigate, goBack, exitPrompt, cancelExit, confirmExit } = useAppBackNavigation<NavigationSnapshot>(
    { view, tab, driverTab, driverView },
    restore,
  );

  const wrap = (screen: ReactNode) => (
    <>
      {screen}
      {exitPrompt && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-primary-950/60 p-4 backdrop-blur-sm sm:items-center">
          <div role="alertdialog" aria-modal="true" aria-labelledby="exit-app-title" aria-describedby="exit-app-description" className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-3d animate-scale-in">
            <h2 id="exit-app-title" className="font-display text-xl font-bold text-card-foreground">Exit Vahakam?</h2>
            <p id="exit-app-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">Do you want to close the app, or stay on the home screen?</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={cancelExit}>Stay in app</Button>
              <Button variant="primary" onClick={confirmExit}>Exit app</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (loading) return wrap(<FullPageLoader label="Loading Vahakam…" />);
  if (!user || !profile || registrationRequired) return wrap(<AuthScreen />);
  if (profile.role === 'admin') return wrap(<AdminDashboard />);

  if (profile.role === 'driver') {
    const openDriverView = (next: DriverView) => navigate({ view, tab, driverTab, driverView: next });
    const driverHome = () => navigate({ view, tab, driverTab, driverView: { name: 'home' } });
    if (driverView.name === 'kyc') return wrap(<KycScreen onBack={goBack} />);
    if (driverView.name === 'trip') {
      return wrap(
        <DriverTripDetail
          booking={driverView.booking}
          onBack={goBack}
          onChat={(bookingId) => openDriverView({ name: 'chat', bookingId })}
          onCompleted={driverHome}
        />,
      );
    }
    if (driverView.name === 'chat') return wrap(<ChatScreen bookingId={driverView.bookingId} onBack={goBack} />);
    return wrap(
      <DriverShell
        tab={driverTab}
        onTab={(nextTab) => navigate({ view, tab, driverTab: nextTab, driverView: { name: 'home' } })}
        onTrip={(booking) => openDriverView({ name: 'trip', booking })}
        onKyc={() => openDriverView({ name: 'kyc' })}
        onChat={(bookingId) => openDriverView({ name: 'chat', bookingId })}
      />,
    );
  }

  if (!profile.shipper_profile_completed) return wrap(<ShipperProfileSetup />);

  const openShipperView = (next: ShipperView) => navigate({ view: next, tab, driverTab, driverView });
  const dashboard = () => navigate({ view: { name: 'dashboard' }, tab, driverTab, driverView });

  switch (view.name) {
    case 'newBooking':
      return wrap(<BookingForm shipperId={user.id} onBack={goBack} onCreated={(booking) => openShipperView({ name: 'summary', booking, justCreated: true })} />);
    case 'summary':
      return wrap(<BookingSummary booking={view.booking} justCreated={view.justCreated} onBack={goBack} onDone={dashboard} />);
    case 'tripDetail':
      return wrap(
        <ShipperTripDetail
          booking={view.booking}
          onBack={goBack}
          onChat={(bookingId) => openShipperView({ name: 'chat', bookingId })}
        />,
      );
    case 'chat':
      return wrap(<ChatScreen bookingId={view.bookingId} onBack={goBack} />);
    case 'dashboard':
    default:
      return wrap(
        <ShipperShell
          tab={tab}
          onTabChange={(nextTab) => navigate({ view: { name: 'dashboard' }, tab: nextTab, driverTab, driverView })}
          onNewBooking={() => openShipperView({ name: 'newBooking' })}
          onOpenBooking={(booking) => openShipperView({ name: 'tripDetail', booking })}
        />,
      );
  }
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const hideSplash = useCallback(() => setSplashDone(true), []);
  return (
    <LangProvider>
      <AuthProvider>
        <AppRoutes />
        {!splashDone && <SplashScreen onDone={hideSplash} />}
      </AuthProvider>
    </LangProvider>
  );
}
