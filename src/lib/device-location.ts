import type { PositionOptions } from '@capacitor/geolocation';

export interface DevicePosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp?: number;
}

export type DeviceLocationErrorKind = 'unsupported' | 'denied' | 'disabled' | 'timeout' | 'unavailable';
export type DeviceLocationPermission = 'prompt' | 'granted' | 'denied' | 'unsupported';

export class DeviceLocationError extends Error {
  constructor(public readonly kind: DeviceLocationErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'DeviceLocationError';
  }
}

async function nativeGeolocation() {
  const [{ Capacitor }, { Geolocation }] = await Promise.all([
    import('@capacitor/core'),
    import('@capacitor/geolocation'),
  ]);
  return Capacitor.isNativePlatform() ? Geolocation : null;
}

function browserPosition(options: PositionOptions): Promise<DevicePosition> {
  if (!navigator.geolocation) return Promise.reject(new DeviceLocationError('unsupported'));
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function getDeviceLocationErrorKind(error: unknown): DeviceLocationErrorKind {
  if (error instanceof DeviceLocationError) return error.kind;
  const value = (typeof error === 'object' && error !== null ? error : {}) as { code?: unknown; name?: unknown; message?: unknown };
  const code = String(value.code ?? '');
  const text = `${value.name ?? ''} ${value.message ?? ''}`.toLowerCase();

  if (code === '1' || code === 'OS-PLUG-GLOC-0003' || text.includes('notallowederror') || text.includes('permission') && text.includes('denied')) return 'denied';
  if (['OS-PLUG-GLOC-0007', 'OS-PLUG-GLOC-0009', 'OS-PLUG-GLOC-0016', 'OS-PLUG-GLOC-0017'].includes(code) || text.includes('location services are not enabled') || text.includes('location turned off')) return 'disabled';
  if (code === '3' || code === 'OS-PLUG-GLOC-0010' || text.includes('timeout')) return 'timeout';
  return 'unavailable';
}

export function getDeviceLocationErrorMessage(error: unknown): string {
  switch (getDeviceLocationErrorKind(error)) {
    case 'denied':
      return 'Location permission is off. In Android Settings → Apps → Vahakam → Permissions → Location, choose “Allow only while using the app”, then try again.';
    case 'disabled':
      return 'Phone location (GPS) is off. Turn on Location in Quick Settings, then tap My location again.';
    case 'timeout':
      return 'GPS is taking too long to find you. Move to an open area, keep Location on, and try again.';
    case 'unsupported':
      return 'Location is not available on this device. Pick the spot on the map instead.';
    default:
      return 'Could not read your location. Check that phone Location is on, then try again or pick the spot on the map.';
  }
}

async function withLocationTimeout<T>(request: Promise<T>, timeout: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeviceLocationError('timeout')), timeout);
  });
  try {
    return await Promise.race([request, deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function getCurrentDevicePosition(options: PositionOptions = {}): Promise<DevicePosition> {
  const resolvedOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 30000,
    enableLocationFallback: true,
    ...options,
  };
  const timeout = resolvedOptions.timeout ?? 20000;
  try {
    const native = await nativeGeolocation();
    if (!native) return await withLocationTimeout(browserPosition(resolvedOptions), timeout + 1000);

    if (resolvedOptions.enableHighAccuracy === false) {
      return await withLocationTimeout(native.getCurrentPosition(resolvedOptions), timeout + 1000);
    }

    return await withLocationTimeout((async () => {
      // A balanced/network fix is normally immediate indoors. Some Android devices
      // never settle a precise first request, so reserve time for a GPS retry.
      const quickTimeout = Math.min(8000, Math.max(2000, Math.floor(timeout / 3)));
      try {
        return await withLocationTimeout(native.getCurrentPosition({
          ...resolvedOptions,
          enableHighAccuracy: false,
          timeout: quickTimeout,
        }), quickTimeout + 1000);
      } catch (error) {
        const kind = getDeviceLocationErrorKind(error);
        if (kind === 'denied' || kind === 'disabled' || kind === 'unsupported') throw error;
      }
      return native.getCurrentPosition(resolvedOptions);
    })(), timeout + 1000);
  } catch (error) {
    throw new DeviceLocationError(getDeviceLocationErrorKind(error), error instanceof Error ? error.message : undefined);
  }
}

export async function getDeviceLocationPermission(): Promise<DeviceLocationPermission> {
  try {
    const native = await nativeGeolocation();
    if (native) {
      const status = await native.checkPermissions();
      if (status.location === 'granted' || status.coarseLocation === 'granted') return 'granted';
      return status.location === 'denied' || status.coarseLocation === 'denied' ? 'denied' : 'prompt';
    }
    if (!navigator.geolocation) return 'unsupported';
    const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return status?.state ?? 'prompt';
  } catch {
    return 'prompt';
  }
}

export async function watchDevicePosition(
  onPosition: (position: DevicePosition) => void,
  onError: (error: DeviceLocationError) => void,
  options: PositionOptions = {},
): Promise<() => Promise<void>> {
  const resolvedOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 10000,
    enableLocationFallback: true,
    ...options,
  };
  const native = await nativeGeolocation();

  if (native) {
    let disposed = false;
    let watchId: string | null = null;
    const id = await native.watchPosition(resolvedOptions, (position, error) => {
      if (position) onPosition(position);
      else onError(new DeviceLocationError(getDeviceLocationErrorKind(error)));
    });
    if (disposed) await native.clearWatch({ id });
    else watchId = id;
    return async () => {
      disposed = true;
      if (watchId) await native.clearWatch({ id: watchId });
    };
  }

  if (!navigator.geolocation) throw new DeviceLocationError('unsupported');
  const id = navigator.geolocation.watchPosition(
    onPosition,
    (error) => onError(new DeviceLocationError(getDeviceLocationErrorKind(error), error.message)),
    resolvedOptions,
  );
  return async () => navigator.geolocation.clearWatch(id);
}
