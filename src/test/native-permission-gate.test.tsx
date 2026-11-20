import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NativePermissionGate from '@/components/NativePermissionGate';

const permissionMocks = vi.hoisted(() => ({
  statuses: vi.fn(),
  status: vi.fn(),
  request: vi.fn(),
  message: vi.fn(() => 'Permission request failed'),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@/lib/device-permissions', () => ({
  getDevicePermissionStatuses: permissionMocks.statuses,
  getDevicePermissionStatus: permissionMocks.status,
  requestDevicePermission: permissionMocks.request,
  getDevicePermissionErrorMessage: permissionMocks.message,
}));

describe('Post-login native permission screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    permissionMocks.statuses.mockResolvedValue({ location: 'prompt', camera: 'prompt', notifications: 'prompt' });
    permissionMocks.request.mockResolvedValue('granted');
  });

  it('requests Location, Camera and Notifications once after login', async () => {
    render(<NativePermissionGate userId="driver-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Allow permissions' }));

    await waitFor(() => expect(permissionMocks.request).toHaveBeenCalledTimes(3));
    expect(permissionMocks.request.mock.calls.map(call => call[0])).toEqual(['location', 'camera', 'notifications']);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('vahakam-native-permissions-v1-driver-1')).toBe('seen');
  });

  it('keeps the screen available with guidance when the user denies a prompt', async () => {
    permissionMocks.request.mockResolvedValue('denied');
    render(<NativePermissionGate userId="driver-2" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Allow permissions' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Some permissions were denied');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeEnabled();
  });
});
