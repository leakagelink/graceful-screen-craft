import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DriverDashboard from '@/screens/DriverDashboard';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  refreshProfile: vi.fn(),
  updateError: null as { message: string } | null,
  profile: {
    id: 'driver-1',
    role: 'driver',
    full_name: 'Test Driver',
    is_online: false,
    kyc_status: 'approved',
    free_until: null,
    referral_code: null,
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: mocks.profile, signOut: vi.fn(), refreshProfile: mocks.refreshProfile }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/components/Truck3D', () => ({ default: () => <div /> }));
vi.mock('@/components/LangSwitcher', () => ({ LangSwitcher: () => <div /> }));
vi.mock('@/components/NotificationsBell', () => ({ NotificationsBell: () => <div /> }));
vi.mock('@/components/BankAccountModal', () => ({ default: () => <div /> }));

const openLoad = {
  id: 'booking-1', shipper_id: 'shipper-1', driver_id: null,
  pickup_location: 'Delhi', drop_location: 'Bhopal', material_type: 'Boxes',
  vehicle_type: 'mini_truck', status: 'available', total_fare: 5000, agreed_fare: null,
  created_at: '2026-11-19T00:00:00Z', distance_km: 775, trip_date: '2026-11-20',
};

beforeEach(() => {
  mocks.profile.is_online = false;
  mocks.updateError = null;
  mocks.refreshProfile.mockReset().mockResolvedValue(undefined);
  mocks.from.mockReset().mockImplementation((table: string) => {
    if (table === 'bookings') {
      return { select: () => ({ order: async () => ({ data: [openLoad], error: null }) }) };
    }
    if (table === 'profiles') {
      return {
        update: (values: { is_online: boolean }) => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { is_online: values.is_online }, error: mocks.updateError }),
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
});

afterEach(cleanup);

describe('Driver availability', () => {
  it('saves the new state and refreshes the visible profile', async () => {
    render(<DriverDashboard onOpenBooking={vi.fn()} onOpenKyc={vi.fn()} />);
    const toggle = await screen.findByRole('switch', { name: 'Driver availability' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalledOnce());
    expect(mocks.from).toHaveBeenCalledWith('profiles');
  });

  it('keeps the old state visible and reports a failed save', async () => {
    mocks.updateError = { message: 'Could not save availability' };
    render(<DriverDashboard onOpenBooking={vi.fn()} onOpenKyc={vi.fn()} />);
    const toggle = await screen.findByRole('switch', { name: 'Driver availability' });
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save availability');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(mocks.refreshProfile).not.toHaveBeenCalled();
  });

  it('does not show open loads while the driver is offline', async () => {
    render(<DriverDashboard onOpenBooking={vi.fn()} onOpenKyc={vi.fn()} />);
    expect(await screen.findByText('Loads are paused while you are offline')).toBeInTheDocument();
    expect(screen.queryByText('Delhi')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Available (0)' })).toBeInTheDocument();
  });
});
