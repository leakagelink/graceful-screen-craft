import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tries a fast native Android location before requesting precise GPS', async () => {
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.getCurrentPosition.mockResolvedValue({ coords: { latitude: 23.2599, longitude: 77.4126 } });

    const position = await getCurrentDevicePosition();

    expect(position.coords.latitude).toBe(23.2599);
    expect(nativeMocks.getCurrentPosition).toHaveBeenCalledOnce();
    expect(nativeMocks.getCurrentPosition).toHaveBeenCalledWith(expect.objectContaining({
      enableHighAccuracy: false,
      enableLocationFallback: true,
      timeout: 6666,
    }));
  });

  it('retries with precise GPS when the fast Android fix is unavailable', async () => {
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.getCurrentPosition
      .mockRejectedValueOnce({ code: 2 })
      .mockResolvedValueOnce({ coords: { latitude: 23.2599, longitude: 77.4126 } });

    const position = await getCurrentDevicePosition();

    expect(position.coords.longitude).toBe(77.4126);
    expect(nativeMocks.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(nativeMocks.getCurrentPosition).toHaveBeenLastCalledWith(expect.objectContaining({
      enableHighAccuracy: true,
      timeout: 20000,
    }));
  });

  it('stops waiting when a native Android location request never settles', async () => {
    vi.useFakeTimers();
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.getCurrentPosition.mockReturnValue(new Promise(() => {}));

    const result = getCurrentDevicePosition({ enableHighAccuracy: false, timeout: 100 }).catch(error => error);
    await vi.advanceTimersByTimeAsync(1101);

    const error = await result;
    expect(error).toMatchObject({ kind: 'timeout' });
    expect(getDeviceLocationErrorMessage(error)).toContain('open area');
  });

  it('does not retry GPS after Android location permission is denied', async () => {
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.getCurrentPosition.mockRejectedValue({ code: 'OS-PLUG-GLOC-0003' });

    await expect(getCurrentDevicePosition()).rejects.toMatchObject({ kind: 'denied' });
    expect(nativeMocks.getCurrentPosition).toHaveBeenCalledOnce();
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

  it('reports a live-location startup timeout and recovers when a position arrives', async () => {
    vi.useFakeTimers();
    nativeMocks.isNativePlatform.mockReturnValue(true);
    let callback: ((position?: unknown, error?: unknown) => void) | undefined;
    nativeMocks.watchPosition.mockImplementation((_options, handler) => {
      callback = handler;
      return Promise.resolve('trip-watch');
    });
    const onPosition = vi.fn();
    const onError = vi.fn();

    const stop = await watchDevicePosition(onPosition, onError, { timeout: 100 });
    await vi.advanceTimersByTimeAsync(1101);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'timeout' }));

    callback?.({ coords: { latitude: 23.2599, longitude: 77.4126 } });
    expect(onPosition).toHaveBeenCalledOnce();
    await stop();
  });

  it('rejects when native live-location setup never settles', async () => {
    vi.useFakeTimers();
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.watchPosition.mockReturnValue(new Promise(() => {}));

    const result = watchDevicePosition(vi.fn(), vi.fn(), { timeout: 100 }).catch(error => error);
    await vi.advanceTimersByTimeAsync(1101);

    expect(await result).toMatchObject({ kind: 'timeout' });
  });

  it('clears a native live-location watch during cleanup', async () => {
    nativeMocks.isNativePlatform.mockReturnValue(true);
    nativeMocks.watchPosition.mockResolvedValue('trip-watch');

    const stop = await watchDevicePosition(vi.fn(), vi.fn());
    await stop();

    expect(nativeMocks.clearWatch).toHaveBeenCalledWith({ id: 'trip-watch' });
  });
});
