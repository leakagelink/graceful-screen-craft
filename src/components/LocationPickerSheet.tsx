import { useEffect, useRef, useState, type FormEvent } from 'react';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Check, Loader2, LocateFixed, MapPin, Minus, Plus, Search, X } from 'lucide-react';
import { Button, inputClass } from '@/components/ui';
import { reverseGeocode, searchPlaces, type LatLng, type PlaceResult } from '@/lib/routing';

export interface PickedLocation {
  address: string;
  point: LatLng;
}

interface Props {
  title: string;
  initialCenter: LatLng | null;
  initialPoint: LatLng | null;
  initialAddress: string;
  onConfirm: (location: PickedLocation) => void;
  onClose: () => void;
}

const MAHARASHTRA_CENTER: LatLng = { lat: 19.7515, lng: 75.7139 };
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

export default function LocationPickerSheet({
  title,
  initialCenter,
  initialPoint,
  initialAddress,
  onConfirm,
  onClose,
}: Props) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const placeRef = useRef<((p: LatLng, knownLabel?: string) => void) | null>(null);
  const requestIdRef = useRef(0);

  const [point, setPoint] = useState<LatLng | null>(initialPoint);
  const [address, setAddress] = useState(initialAddress);
  const [addressStatus, setAddressStatus] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [mapAttempt, setMapAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let map: L.Map | null = null;
    setMapStatus('loading');

    async function createMap() {
      try {
        const [leaflet, maplibre, adapter, worker] = await Promise.all([
          import('leaflet'),
          import('maplibre-gl'),
          import('@maplibre/maplibre-gl-leaflet'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
        ]);
        const el = mapElRef.current;
        if (cancelled || !el) return;

        maplibre.setWorkerUrl(worker.default);
        const pinIcon = leaflet.divIcon({
          className: 'location-pin',
          html: '<div class="location-pin-wrap"><span class="location-pin-pulse"></span><span class="location-pin-marker"><span class="location-pin-dot"></span></span><span class="location-pin-shadow"></span></div>',
          iconSize: [44, 52],
          iconAnchor: [22, 48],
        });

        const start = initialPoint ?? initialCenter ?? MAHARASHTRA_CENTER;
        const zoom = initialPoint ? 16 : initialCenter ? 13 : 7;
        map = leaflet
          .map(el, {
            zoomControl: false,
            attributionControl: true,
            minZoom: 4,
            maxZoom: 19,
            maxBounds: [
              [85, -180],
              [-85, 180],
            ],
            maxBoundsViscosity: 1,
          })
          .setView([start.lat, start.lng], zoom);

        adapter.maplibreGL({
          style: MAP_STYLE_URL,
        }).addTo(map);
        mapRef.current = map;

        const choose = (p: LatLng, knownLabel?: string) => {
          if (!map) return;
          if (markerRef.current) {
            markerRef.current.setLatLng([p.lat, p.lng]);
          } else {
            markerRef.current = leaflet
              .marker([p.lat, p.lng], { icon: pinIcon, draggable: true, keyboard: false })
              .addTo(map)
              .on('dragend', () => {
                const ll = markerRef.current?.getLatLng();
                if (ll) choose({ lat: ll.lat, lng: ll.lng });
              });
          }
          setPoint(p);

          const requestId = ++requestIdRef.current;
          if (knownLabel !== undefined) {
            setAddress(knownLabel);
            setAddressStatus('idle');
            return;
          }
          setAddressStatus('loading');
          reverseGeocode(p)
            .then((label) => {
              if (requestId !== requestIdRef.current) return;
              setAddress(label ?? '');
              setAddressStatus(label ? 'idle' : 'failed');
            })
            .catch(() => {
              if (requestId !== requestIdRef.current) return;
              setAddressStatus('failed');
            });
        };

        placeRef.current = choose;
        map.on('click', (event: L.LeafletMouseEvent) =>
          choose({ lat: event.latlng.lat, lng: event.latlng.lng }),
        );
        if (initialPoint) choose(initialPoint, initialAddress || undefined);
        setMapStatus('ready');
        window.requestAnimationFrame(() => {
          if (!cancelled) map?.invalidateSize();
        });
      } catch {
        if (!cancelled) setMapStatus('failed');
      }
    }

    void createMap();
    return () => {
      cancelled = true;
      requestIdRef.current += 1;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
      placeRef.current = null;
    };
    // The map is recreated only when retrying; later state changes use placeRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapAttempt]);

  function useCurrentLocation() {
    setNotice(null);
    if (!navigator.geolocation) {
      setNotice('Location is not available on this device. Pick the spot on the map instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        placeRef.current?.(p);
        mapRef.current?.flyTo([p.lat, p.lng], 17, { duration: 0.8 });
      },
      (err) => {
        setLocating(false);
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission is off. Allow location for this app in your phone settings, or pick the spot on the map.'
            : 'Could not read your location. Try again or pick the spot on the map.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setNotice(null);
    try {
      const found = await searchPlaces(query);
      setResults(found);
      if (found.length === 0) setNotice('No places found. Try another name or pick the spot on the map.');
    } catch {
      setResults([]);
      setNotice('Search is unavailable right now. Pick the spot on the map instead.');
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: PlaceResult) {
    if (!placeRef.current) {
      setNotice('The map is still loading. Please try again in a moment.');
      return;
    }
    setResults([]);
    setQuery('');
    setNotice(null);
    placeRef.current({ lat: r.lat, lng: r.lng }, r.label);
    mapRef.current?.flyTo([r.lat, r.lng], 16, { duration: 0.8 });
  }

  const canConfirm = point !== null && address.trim().length > 0;

  function confirm() {
    if (!point || !canConfirm) return;
    onConfirm({ address: address.trim(), point });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      <div className="relative z-30 border-b border-border bg-card/95 px-4 pb-4 pt-4 shadow-sm backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Search or tap the map to set your exact spot</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close map"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-transform active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={runSearch} className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search village, area or landmark"
              className={`${inputClass} rounded-2xl border-transparent bg-secondary py-3 pl-11 pr-20 text-sm shadow-inner`}
              aria-label="Search place"
            />
            <button
              type="submit"
              disabled={searching || !query.trim() || mapStatus !== 'ready'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-40"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>

            {results.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xl">
                {results.map((r) => (
                  <li key={`${r.lat},${r.lng}`}>
                    <button
                      type="button"
                      onClick={() => pickResult(r)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm text-card-foreground transition-colors hover:bg-secondary"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      <span>{r.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>
      </div>

      <div className="relative z-0 min-h-[260px] flex-1 overflow-hidden bg-secondary">
        <div ref={mapElRef} className="modern-location-map absolute inset-0" aria-label="Interactive location map" />

        {mapStatus === 'loading' && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-secondary/85 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-card-foreground shadow-xl">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              Loading modern map…
            </div>
          </div>
        )}

        {mapStatus === 'failed' && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-secondary p-6">
            <div className="max-w-xs rounded-3xl border border-border bg-card p-6 text-center shadow-xl">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-primary-600" />
              <p className="font-semibold text-card-foreground">Map could not load</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your internet connection and try again.</p>
              <Button className="mt-4 w-full" onClick={() => setMapAttempt((value) => value + 1)}>
                Retry map
              </Button>
            </div>
          </div>
        )}

        {mapStatus === 'ready' && (
          <>
            <div className="absolute right-3 top-3 z-[1000] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-secondary active:bg-primary-50"
              >
                <Plus className="h-5 w-5" />
              </button>
              <div className="mx-2 h-px bg-border" />
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-secondary active:bg-primary-50"
              >
                <Minus className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="absolute bottom-10 right-3 z-[1000] inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-primary-700 shadow-xl transition-all hover:bg-primary-50 active:scale-95 disabled:opacity-60"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              My location
            </button>

            {!point && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-primary-950/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur">
                <MapPin className="h-3.5 w-3.5" />
                Tap the map to drop a pin
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-20 -mt-5 rounded-t-[1.75rem] border-t border-border bg-card px-4 pb-5 pt-5 shadow-2xl">
        <div className="mx-auto w-full max-w-lg space-y-3">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
          {notice && (
            <p role="alert" className="rounded-xl bg-error-50 px-3 py-2 text-xs font-medium text-error-600">
              {notice}
            </p>
          )}
          <div>
            <label htmlFor="picked-address" className="mb-1.5 block text-xs font-bold text-card-foreground">
              Selected address
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-600" />
              <input
                id="picked-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={point ? 'Address for this pin' : 'Pin a spot on the map first'}
                disabled={!point}
                className={`${inputClass} rounded-2xl py-3 pl-10 text-sm`}
              />
            </div>
            <p className="mt-1.5 min-h-4 text-xs text-muted-foreground">
              {!point && 'Tap the map or search to set the exact spot.'}
              {point && addressStatus === 'loading' && 'Finding the address…'}
              {point && addressStatus === 'failed' && 'No address found for this pin. Type it in the box above.'}
              {point && addressStatus === 'idle' && `Pinned at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
            </p>
          </div>
          <Button variant="primary" size="lg" className="w-full rounded-2xl" onClick={confirm} disabled={!canConfirm}>
            <Check className="h-4 w-4" />
            Use this location
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MapPinButton({ point, onClick }: { point: LatLng | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-primary-300 bg-primary-50/60 px-4 py-3 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-50 active:scale-[0.99]"
    >
      <span className="flex items-center gap-2">
        {point ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
        {point ? 'Location pinned on map' : 'Pin exact spot on map'}
      </span>
      <span className="text-xs font-semibold text-primary-600">{point ? 'Change' : 'Open map'}</span>
    </button>
  );
}
