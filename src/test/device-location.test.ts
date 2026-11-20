import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentDevicePosition,
  getDeviceLocationErrorKind,
  getDeviceLocationErrorMessage,
  watchDevicePosition,
} from '@/lib/device-location';

const nativeMocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
  checkPermissions: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: nativeMocks.isNativePlatform } }));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: nativeMocks }));

describe('Device location', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeMocks.isNativePlatform.mockReturnValue(false);
  });

  it('uses native Android GPS with high accuracy and fallback enabled', async () => {
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.getCurrentPosition.mockResolvedValue({ coords: { latitude: 23.2599, longitude: 77.4126 } });

    const position = await getCurrentDevicePosition();

    expect(position.coords.latitude).toBe(23.2599);
    expect(nativeMocks.getCurrentPosition).toHaveBeenCalledWith(expect.objectContaining({
      enableHighAccuracy: true,
      enableLocationFallback: true,
      timeout: 20000,
    }));
  });

  it('keeps browser geolocation working outside the Android app', async () => {
    const getCurrentPosition = vi.fn((success: (position: unknown) => void) => success({ coords: { latitude: 28.6139, longitude: 77.209 } }));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });

    const position = await getCurrentDevicePosition();

    expect(position.coords.longitude).toBe(77.209);
    expect(nativeMocks.getCurrentPosition).not.toHaveBeenCalled();
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it.each([
    [{ code: 'OS-PLUG-GLOC-0003' }, 'denied', 'Android Settings'],
    [{ code: 'OS-PLUG-GLOC-0007' }, 'disabled', 'GPS) is off'],
    [{ code: 'OS-PLUG-GLOC-0010' }, 'timeout', 'open area'],
    [{ code: 2 }, 'unavailable', 'Check that phone Location is on'],
  ] as const)('explains location error %o with an actionable next step', (error, kind, instruction) => {
    expect(getDeviceLocationErrorKind(error)).toBe(kind);
    expect(getDeviceLocationErrorMessage(error)).toContain(instruction);
  });

  it('clears a native live-location watch during cleanup', async () => {
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.watchPosition.mockResolvedValue('trip-watch');

    const stop = await watchDevicePosition(vi.fn(), vi.fn());
    await stop();

    expect(nativeMocks.clearWatch).toHaveBeenCalledWith({ id: 'trip-watch' });
  });
});
