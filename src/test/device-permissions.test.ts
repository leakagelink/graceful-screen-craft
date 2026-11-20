import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDevicePermissionStatuses,
  requestDevicePermission,
} from '@/lib/device-permissions';

const nativeMocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  locationCheck: vi.fn(),
  locationRequest: vi.fn(),
  cameraCheck: vi.fn(),
  cameraRequest: vi.fn(),
  notificationCheck: vi.fn(),
  notificationRequest: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: nativeMocks.isNativePlatform } }));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: {
  checkPermissions: nativeMocks.locationCheck,
  requestPermissions: nativeMocks.locationRequest,
} }));
vi.mock('@capacitor/camera', () => ({ Camera: {
  checkPermissions: nativeMocks.cameraCheck,
  requestPermissions: nativeMocks.cameraRequest,
} }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  checkPermissions: nativeMocks.notificationCheck,
  requestPermissions: nativeMocks.notificationRequest,
} }));

describe('Native device permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.locationCheck.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    nativeMocks.cameraCheck.mockResolvedValue({ camera: 'prompt', photos: 'prompt' });
    nativeMocks.notificationCheck.mockResolvedValue({ display: 'prompt' });
    nativeMocks.locationRequest.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    nativeMocks.cameraRequest.mockResolvedValue({ camera: 'granted', photos: 'prompt' });
    nativeMocks.notificationRequest.mockResolvedValue({ display: 'granted' });
  });

  it('reads all three native permission states', async () => {
    nativeMocks.locationCheck.mockResolvedValue({ location: 'denied', coarseLocation: 'granted' });
    nativeMocks.cameraCheck.mockResolvedValue({ camera: 'prompt', photos: 'granted' });
    nativeMocks.notificationCheck.mockResolvedValue({ display: 'denied' });

    expect(await getDevicePermissionStatuses()).toEqual({ location: 'granted', camera: 'prompt', notifications: 'denied' });
  });

  it.each([
    ['location', 'locationRequest', { permissions: ['location'] }],
    ['camera', 'cameraRequest', { permissions: ['camera'] }],
    ['notifications', 'notificationRequest', undefined],
  ] as const)('requests native %s permission through its system prompt', async (kind, mockName, expected) => {
    if (kind === 'location') {
      nativeMocks.locationCheck.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    }

    expect(await requestDevicePermission(kind)).toBe('granted');
    if (expected) expect(nativeMocks[mockName]).toHaveBeenCalledWith(expected);
    else expect(nativeMocks[mockName]).toHaveBeenCalledOnce();
  });
});
