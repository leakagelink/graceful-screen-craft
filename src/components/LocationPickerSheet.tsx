import { useEffect, useRef, useState, type FormEvent } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
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
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const pinIcon = L.divIcon({
  className: 'location-pin',
  html: '<div class="flex flex-col items-center drop-shadow-lg"><div class="w-8 h-8 rounded-full bg-primary-600 border-[3px] border-white"></div><div class="-mt-1.5 w-2.5 h-2.5 rotate-45 bg-primary-600"></div></div>',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

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

  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    const start = initialPoint ?? initialCenter ?? MAHARASHTRA_CENTER;
    const zoom = initialPoint ? 16 : initialCenter ? 13 : 7;
    const map = L.map(el).setView([start.lat, start.lng], zoom);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    const choose = (p: LatLng, knownLabel?: string) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([p.lat, p.lng]);
      } else {
        markerRef.current = L.marker([p.lat, p.lng], { icon: pinIcon, draggable: true })
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
    map.on('click', (e: L.LeafletMouseEvent) => choose({ lat: e.latlng.lat, lng: e.latlng.lng }));
    if (initialPoint) choose(initialPoint, initialAddress || undefined);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      placeRef.current = null;
    };
    // The map is created once per opening; later state changes are driven through placeRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        mapRef.current?.setView([p.lat, p.lng], 17);
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
    setResults([]);
    setQuery('');
    setNotice(null);
    placeRef.current?.({ lat: r.lat, lng: r.lng }, r.label);
    mapRef.current?.setView([r.lat, r.lng], 16);
  }

  const canConfirm = point !== null && address.trim().length > 0;

  function confirm() {
    if (!point || !canConfirm) return;
    onConfirm({ address: address.trim(), point });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
      <div className="relative z-20 px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close map"
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={runSearch} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search village, area or landmark"
            className={`${inputClass} pl-10 pr-20 py-2.5 text-sm`}
            aria-label="Search place"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-40 transition-colors"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>

          {results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    onClick={() => pickResult(r)}
                    className="w-full px-4 py-3 text-left text-sm text-slate-800 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>

      <div className="relative z-0 flex-1 min-h-[260px]">
        <div ref={mapElRef} className="absolute inset-0" />
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="absolute right-3 bottom-3 z-10 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-lg border border-slate-200 hover:bg-primary-50 active:scale-95 disabled:opacity-60 transition-all"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          My location
        </button>
        {!point && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-white">
            Tap the map to drop a pin
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-5 border-t border-slate-200 bg-white space-y-3">
        {notice && (
          <p role="alert" className="text-xs font-medium text-error-600 bg-error-50 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}
        <div>
          <label htmlFor="picked-address" className="block text-xs font-semibold text-slate-600 mb-1.5">
            Address
          </label>
          <input
            id="picked-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={point ? 'Address for this pin' : 'Pin a spot on the map first'}
            disabled={!point}
            className={`${inputClass} py-2.5 text-sm`}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {!point && 'Tap the map or search to set the exact spot.'}
            {point && addressStatus === 'loading' && 'Finding the address...'}
            {point && addressStatus === 'failed' && 'No address found for this pin. Type it in the box above.'}
            {point && addressStatus === 'idle' && `Pinned at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
          </p>
        </div>
        <Button variant="primary" size="lg" className="w-full" onClick={confirm} disabled={!canConfirm}>
          <Check className="w-4 h-4" />
          Use this location
        </Button>
      </div>
    </div>
  );
}

export function MapPinButton({ point, onClick }: { point: LatLng | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary-300 bg-primary-50/60 px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 active:scale-[0.99] transition-all"
    >
      <span className="flex items-center gap-2">
        {point ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
        {point ? 'Location pinned on map' : 'Pin exact spot on map'}
      </span>
      <span className="text-xs font-semibold text-primary-600">{point ? 'Change' : 'Open map'}</span>
    </button>
  );
}
