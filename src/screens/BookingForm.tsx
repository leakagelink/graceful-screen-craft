import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  Calendar,
  Calculator,
  Search,
  Loader2,
  Route,
  ChevronDown,
} from 'lucide-react';
import type { Booking, VehicleType } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import {
  VEHICLES,
  computeFare,
  formatCurrency,
  getVehicle,
  searchVehicles,
} from '@/lib/fare';
import { routeDistanceKm, type LatLng } from '@/lib/routing';
import type { City } from '@/lib/cities';
import { Button, Field, inputClass, Spinner } from '@/components/ui';
import CityAutocomplete from '@/components/CityAutocomplete';
import LocationPickerSheet, { MapPinButton, type PickedLocation } from '@/components/LocationPickerSheet';
import GoodsTypeSheet from '@/components/GoodsTypeSheet';

interface Props {
  shipperId: string;
  onBack: () => void;
  onCreated: (booking: Booking) => void;
}

export default function BookingForm({ shipperId, onBack, onCreated }: Props) {
  const [pickup, setPickup] = useState('');
  const [pickupCity, setPickupCity] = useState<City | undefined>(undefined);
  const [pickupPoint, setPickupPoint] = useState<LatLng | null>(null);
  const [drop, setDrop] = useState('');
  const [dropCity, setDropCity] = useState<City | undefined>(undefined);
  const [dropPoint, setDropPoint] = useState<LatLng | null>(null);
  const [pickerFor, setPickerFor] = useState<'pickup' | 'drop' | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>('mini_truck');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [material, setMaterial] = useState('');
  const [showGoodsSheet, setShowGoodsSheet] = useState(false);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [distance, setDistance] = useState(0);
  const [routeSource, setRouteSource] = useState<'osrm' | 'fallback' | null>(null);
  const [routing, setRouting] = useState(false);

  const fare = computeFare(getVehicle(vehicleType), distance);

  const today = new Date().toISOString().split('T')[0];
  const canSubmit =
    pickup.trim() &&
    drop.trim() &&
    material.trim() &&
    weight.trim() &&
    date &&
    distance > 0 &&
    !submitting;

  const filteredVehicles = useMemo(
    () => searchVehicles(vehicleQuery),
    [vehicleQuery]
  );

  // Recompute real driving distance whenever both locations are set.
  useEffect(() => {
    const a = pickup.trim();
    const b = drop.trim();
    if (!a || !b) {
      setDistance(0);
      setRouteSource(null);
      return;
    }
    let active = true;
    setRouting(true);
    routeDistanceKm(a, b, pickupPoint, dropPoint)
      .then((res) => {
        if (!active) return;
        setDistance(res.km);
        setRouteSource(res.source);
      })
      .finally(() => {
        if (active) setRouting(false);
      });
    return () => {
      active = false;
    };
  }, [pickup, drop, pickupPoint, dropPoint]);

  function applyPicked(loc: PickedLocation) {
    if (pickerFor === 'pickup') {
      setPickup(loc.address);
      setPickupCity(undefined);
      setPickupPoint(loc.point);
    } else if (pickerFor === 'drop') {
      setDrop(loc.address);
      setDropCity(undefined);
      setDropPoint(loc.point);
    }
    setPickerFor(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('bookings')
      .insert({
        shipper_id: shipperId,
        pickup_location: pickup.trim(),
        drop_location: drop.trim(),
        vehicle_type: vehicleType,
        material_type: material.trim(),
        weight_kg: Number(weight) || null,
        notes: notes.trim() || null,
        trip_date: date,
        pickup_lat: pickupPoint?.lat ?? null,
        pickup_lng: pickupPoint?.lng ?? null,
        drop_lat: dropPoint?.lat ?? null,
        drop_lng: dropPoint?.lng ?? null,
        distance_km: distance,
        base_fare: fare.baseFare,
        per_km_rate: fare.perKmRate,
        total_fare: fare.totalFare,
        status: 'available',
      })
      .select()
      .single();
    setSubmitting(false);
    if (err) {
      const paused = err.message?.includes('row-level security');
      setError(
        paused
          ? 'Your plan is locked or expired, so new bookings are paused. Check your subscription on the Account page.'
          : err.message || 'Could not create booking. Please try again.',
      );
      return;
    }
    onCreated(data as Booking);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Header onBack={onBack} title="New Booking" subtitle="नई बुकिंग" />

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5 max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-in-up">
          <CityAutocomplete
            label="Pickup location"
            value={pickup}
            onChange={(v, c) => {
              setPickup(v);
              setPickupCity(c);
              setPickupPoint(c ? { lat: c.lat, lng: c.lng } : null);
            }}
            placeholder="e.g. Nagpur"
            accentColor="accent"
            excludeName={drop}
          />
          <MapPinButton
            point={pickupPoint}
            onClick={() => setPickerFor('pickup')}
          />
          <CityAutocomplete
            label="Drop location"
            value={drop}
            onChange={(v, c) => {
              setDrop(v);
              setDropCity(c);
              setDropPoint(c ? { lat: c.lat, lng: c.lng } : null);
            }}
            placeholder="e.g. Nashik"
            accentColor="error"
            excludeName={pickup}
          />

          <MapPinButton
            point={dropPoint}
            onClick={() => setPickerFor('drop')}
          />

          {/* Route status */}
          {pickup.trim() && drop.trim() && (
            <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2.5 bg-slate-50 border border-slate-200">
              {routing ? (
                <>
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                  <span className="text-slate-500">
                    Calculating road distance via OSRM…
                  </span>
                </>
              ) : distance > 0 ? (
                <>
                  <Route className="w-4 h-4 text-primary-500" />
                  <span className="text-slate-600 font-medium">
                    {distance} km driving distance
                  </span>
                  {routeSource === 'osrm' ? (
                    <span className="ml-auto text-accent-600 font-medium">
                      Live route
                    </span>
                  ) : (
                    <span className="ml-auto text-amber-600 font-medium">
                      Estimated (offline)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">
                    Could not find a road route for these locations.
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-slate-900 text-sm">Select vehicle</h3>
          </div>

          {/* Vehicle search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className={`${inputClass} pl-11`}
              placeholder="Search vehicle — Tata Ace, Bolero, 14ft…"
              value={vehicleQuery}
              onChange={(e) => setVehicleQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2.5">
            {filteredVehicles.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">
                No vehicles match "{vehicleQuery}".
              </p>
            ) : (
              filteredVehicles.map((v) => {
                const selected = v.id === vehicleType;
                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setVehicleType(v.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {v.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {v.labelHi}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {v.capacity} · {formatCurrency(v.baseFare)} base +{' '}
                        {formatCurrency(v.perKmRate)}/km
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {selected && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-in-up">
          <Field label="Goods type">
            <button
              type="button"
              onClick={() => setShowGoodsSheet(true)}
              className={`${inputClass} pl-11 pr-10 text-left relative`}
            >
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <span className={material ? 'text-slate-900' : 'text-slate-400'}>
                {material || 'Select goods type'}
              </span>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </button>
          </Field>
          {showGoodsSheet && (
            <GoodsTypeSheet
              selected={material}
              onClose={() => setShowGoodsSheet(false)}
              onSelect={(goods) => {
                setMaterial(goods);
                setShowGoodsSheet(false);
              }}
            />
          )}

          <Field label="Weight (kg)">
            <div className="relative">
              <input
                type="number"
                min="1"
                className={inputClass}
                placeholder="e.g. 500"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
          </Field>

          <Field label="Notes (optional)" hint="Any special instructions for the driver">
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="e.g. Fragile items, loading assistance needed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <Field label="Trip date">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="date"
                min={today}
                className={`${inputClass} pl-11`}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </Field>
        </div>

        {distance > 0 && (
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-5 text-white animate-scale-in shadow-lg shadow-primary-900/20">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-accent-300" />
              <h3 className="font-bold text-sm">Fare estimate</h3>
              {routeSource === 'osrm' && (
                <span className="ml-auto text-[10px] uppercase tracking-wide bg-accent-500/30 text-accent-200 px-2 py-0.5 rounded-full font-semibold">
                  Live route
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Distance (road)" value={`${distance} km`} />
              <Row label="Base fare" value={formatCurrency(fare.baseFare)} />
              <Row
                label={`${formatCurrency(fare.perKmRate)} × ${distance} km`}
                value={formatCurrency(fare.perKmRate * distance)}
              />
              <div className="h-px bg-white/20 my-1" />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total fare</span>
                <span className="text-2xl font-bold text-accent-300">
                  {formatCurrency(fare.totalFare)}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-error-600 bg-error-500/10 rounded-lg px-3 py-2 font-medium">
            {error}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 p-4 max-w-md mx-auto">
          <Button
            type="submit"
            size="lg"
            variant="accent"
            className="w-full"
            disabled={!canSubmit}
            loading={submitting}
          >
            {submitting ? (
              'Creating booking…'
            ) : distance > 0 ? (
              `Confirm booking · ${formatCurrency(fare.totalFare)}`
            ) : pickup.trim() && drop.trim() ? (
              'Enter both locations to calculate fare'
            ) : (
              'Confirm booking'
            )}
          </Button>
        </div>
      </form>

      {pickerFor && (
        <LocationPickerSheet
          title={pickerFor === 'pickup' ? 'Pickup location on map' : 'Drop location on map'}
          initialCenter={(pickerFor === 'pickup' ? pickupCity : dropCity) ?? null}
          initialPoint={pickerFor === 'pickup' ? pickupPoint : dropPoint}
          initialAddress={pickerFor === 'pickup' ? pickup : drop}
          onConfirm={applyPicked}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-primary-100">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Header({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">{title}</h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export { Spinner };
