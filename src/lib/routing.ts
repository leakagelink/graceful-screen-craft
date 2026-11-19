// @ts-nocheck -- ported from original app; stricter project tsconfig
// Real driving-distance routing via the free, open-source OSRM public API.
// No API key required. Falls back to a great-circle estimate if the
// network request fails or returns no route.

import { type City, findCityByName } from './cities';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceResult extends LatLng {
  label: string;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

interface OSRMRoute {
  routes?: { distance: number; duration: number }[];
  code?: string;
}

/**
 * Fetch the real driving distance (km) and duration (minutes) between two
 * coordinate pairs from the OSRM public routing service.
 */
export async function osrmRoute(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number } | null> {
  const url = `${OSRM_BASE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OSRMRoute;
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      distanceKm: Math.round(route.distance / 1000), // meters -> km
      durationMin: Math.round(route.duration / 60), // seconds -> minutes
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a free-text location string into coordinates. Tries the known
 * Maharashtra city list first, then falls back to an OSRM geocode request.
 */
export async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  const city = findCityByName(location);
  if (city) return { lat: city.lat, lng: city.lng };

  // OSRM does not provide geocoding; use Nominatim (OpenStreetMap) as a
  // free, key-less geocoder covering every Indian state without forcing Maharashtra.
  const q = encodeURIComponent(location.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${q}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    if (!data.length || !data[0].lat || !data[0].lon) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Compute the real driving distance (km) between two location strings.
 * Resolves coordinates, then queries OSRM. Falls back to a great-circle
 * estimate when the network is unavailable.
 */
export async function routeDistanceKm(
  pickup: string,
  drop: string,
  pickupPoint: LatLng | null = null,
  dropPoint: LatLng | null = null
): Promise<{ km: number; source: 'osrm' | 'fallback' }> {
  const [a, b] = await Promise.all([pickupPoint ?? geocode(pickup), dropPoint ?? geocode(drop)]);
  if (a && b) {
    const route = await osrmRoute(a, b);
    if (route && route.distanceKm > 0) {
      return { km: route.distanceKm, source: 'osrm' };
    }
    return { km: haversineKm(a, b), source: 'fallback' };
  }
  return { km: fallbackPseudo(pickup, drop), source: 'fallback' };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function fallbackPseudo(pickup: string, drop: string): number {
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };
  return 8 + (hash(pickup.toLowerCase() + '|' + drop.toLowerCase()) % 53);
}

/**
 * Free-text place search (OpenStreetMap Nominatim), limited to India.
 * Throws on network or HTTP failure so callers can show an error.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = encodeURIComponent(query.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${q}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as { display_name?: string; lat?: string; lon?: string }[];
  return data
    .filter((d) => d.display_name && d.lat && d.lon)
    .map((d) => ({
      label: d.display_name as string,
      lat: parseFloat(d.lat as string),
      lng: parseFloat(d.lon as string),
    }));
}

/** Human-readable address for a point. Returns null when no address is known there. */
export async function reverseGeocode(point: LatLng): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${point.lat}&lon=${point.lng}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}

export type { City };
