// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useCallback, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { FullPageLoader } from '@/components/ui';
import SplashScreen from '@/components/SplashScreen';
import AuthScreen from '@/screens/AuthScreen';
import BookingForm from '@/screens/BookingForm';
import BookingSummary from '@/screens/BookingSummary';
import ShipperTripDetail from '@/screens/ShipperTripDetail';
import ChatScreen from '@/screens/ChatScreen';
import AdminDashboard from '@/screens/AdminDashboard';
import ShipperShell from '@/components/ShipperShell';
import DriverDashboard from '@/screens/DriverDashboard';
import DriverTripDetail from '@/screens/DriverTripDetail';
import KycScreen from '@/screens/KycScreen';
import ShipperProfileSetup from '@/screens/ShipperProfileSetup';
import type { ShipperTab } from '@/components/ShipperBottomNav';
import { backendConfigured, type Booking } from '@/lib/supabase';

type ShipperView =
  | { name: 'dashboard' }
  | { name: 'newBooking' }
  | { name: 'summary'; booking: Booking; justCreated?: boolean }
  | { name: 'tripDetail'; booking: Booking }
  | { name: 'chat'; bookingId: string };

function AppRoutes() {
  const { user, profile, loading, signOut } = useAuth();
  const [view, setView] = useState<ShipperView>({ name: 'dashboard' });
  const [tab, setTab] = useState<ShipperTab>('home');
  const [driverView, setDriverView] = useState<
    { name: 'home' } | { name: 'kyc' } | { name: 'trip'; booking: Booking } | { name: 'chat'; bookingId: string }
  >({ name: 'home' });

  if (!backendConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-primary-100">
          <h1 className="text-2xl font-bold text-slate-900">Vahakam</h1>
          <p className="mt-3 text-slate-600">Login aur data ke liye backend abhi connect nahi hai.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <FullPageLoader label="Loading Vahakam…" />;
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  if (profile.role === 'driver') {
    const home = () => setDriverView({ name: 'home' });
    if (driverView.name === 'kyc') return <KycScreen onBack={home} />;
    if (driverView.name === 'trip')
      return (
        <DriverTripDetail
          booking={driverView.booking}
          onBack={home}
          onChat={(bookingId) => setDriverView({ name: 'chat', bookingId })}
          onCompleted={home}
        />
      );
    if (driverView.name === 'chat') return <ChatScreen bookingId={driverView.bookingId} onBack={home} />;
    return (
      <DriverDashboard
        onOpenBooking={(b) => setDriverView({ name: 'trip', booking: b })}
        onOpenKyc={() => setDriverView({ name: 'kyc' })}
      />
    );
  }

  if (!profile.shipper_profile_completed) {
    return <ShipperProfileSetup />;
  }

  switch (view.name) {
    case 'newBooking':
      return (
        <BookingForm
          shipperId={user.id}
          onBack={() => setView({ name: 'dashboard' })}
          onCreated={(booking) => setView({ name: 'summary', booking, justCreated: true })}
        />
      );
    case 'summary':
      return (
        <BookingSummary
          booking={view.booking}
          justCreated={view.justCreated}
          onBack={() => setView({ name: 'dashboard' })}
          onDone={() => setView({ name: 'dashboard' })}
        />
      );
    case 'tripDetail':
      return (
        <ShipperTripDetail
          booking={view.booking}
          onBack={() => setView({ name: 'dashboard' })}
          onChat={(bookingId) => setView({ name: 'chat', bookingId })}
        />
      );
    case 'chat':
      return (
        <ChatScreen
          bookingId={view.bookingId}
          onBack={() => setView({ name: 'dashboard' })}
        />
      );
    case 'dashboard':
    default:
      return (
        <ShipperShell
          tab={tab}
          onTabChange={setTab}
          onNewBooking={() => setView({ name: 'newBooking' })}
          onOpenBooking={(b) => setView({ name: 'tripDetail', booking: b })}
        />
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
