import {
  getCurrentDevicePosition,
  getDeviceLocationErrorMessage,
  getDeviceLocationPermission,
} from '@/lib/device-location';

export type DevicePermissionKind = 'location' | 'camera' | 'notifications';
export type DevicePermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';
export type DevicePermissionStates = Record<DevicePermissionKind, DevicePermissionState>;

async function isNativePlatform(): Promise<boolean> {
  const { Capacitor } = await import('@capacitor/core');
  return Capacitor.isNativePlatform();
}

function normalizePermissionState(state?: string): DevicePermissionState {
  if (state === 'granted' || state === 'denied') return state;
  return 'prompt';
}

export async function getDevicePermissionStatus(kind: DevicePermissionKind): Promise<DevicePermissionState> {
  if (kind === 'location') return getDeviceLocationPermission();

  if (await isNativePlatform()) {
    if (kind === 'camera') {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.checkPermissions();
      return status.camera === 'limited' ? 'granted' : normalizePermissionState(status.camera);
    }
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const status = await LocalNotifications.checkPermissions();
    return normalizePermissionState(status.display);
  }

  if (kind === 'camera') {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return 'unsupported';
    try {
      const status = await navigator.permissions?.query({ name: 'camera' as PermissionName });
      return normalizePermissionState(status?.state);
    } catch {
      return 'prompt';
    }
  }

  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

export async function getDevicePermissionStatuses(): Promise<DevicePermissionStates> {
  const promptOnError = () => 'prompt' as const;
  return {
    location: await getDevicePermissionStatus('location').catch(promptOnError),
    camera: await getDevicePermissionStatus('camera').catch(promptOnError),
    notifications: await getDevicePermissionStatus('notifications').catch(promptOnError),
  };
}

export async function requestDevicePermission(kind: DevicePermissionKind): Promise<DevicePermissionState> {
  if (kind === 'location') {
    if (await isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions({ permissions: ['location'] });
      return getDeviceLocationPermission();
    }
    await getCurrentDevicePosition();
    return 'granted';
  }

  if (await isNativePlatform()) {
    if (kind === 'camera') {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.requestPermissions({ permissions: ['camera'] });
      return status.camera === 'limited' ? 'granted' : normalizePermissionState(status.camera);
    }
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const status = await LocalNotifications.requestPermissions();
    return normalizePermissionState(status.display);
  }

  if (kind === 'camera') {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return 'unsupported';
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return 'granted';
  }

  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  return result === 'default' ? 'prompt' : result;
}

export function getDevicePermissionErrorMessage(kind: DevicePermissionKind, error: unknown): string {
  if (kind === 'location') return getDeviceLocationErrorMessage(error);
  const value = (typeof error === 'object' && error !== null ? error : {}) as { name?: unknown; message?: unknown };
  const text = `${value.name ?? ''} ${value.message ?? ''}`.toLowerCase();
  const label = kind === 'camera' ? 'Camera' : 'Notifications';
  if (text.includes('denied') || text.includes('notallowed')) {
    return `${label} permission is off. Enable it in Android Settings → Apps → Vahakam → Permissions.`;
  }
  return `Could not request ${label.toLowerCase()} permission. Please try again.`;
}
