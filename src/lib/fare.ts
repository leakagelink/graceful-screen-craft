import type { VehicleType } from './supabase';

export interface VehicleOption {
  id: VehicleType;
  label: string;
  labelHi: string;
  baseFare: number;
  perKmRate: number;
  capacity: string;
  /** Searchable keywords for the vehicle search bar. */
  keywords: string[];
}

export const VEHICLES: VehicleOption[] = [
  {
    id: 'mini_truck',
    label: 'Mini Truck',
    labelHi: 'मिनी ट्रक',
    baseFare: 300,
    perKmRate: 18,
    capacity: 'Up to 1 ton',
    keywords: ['mini truck', 'small truck', 'mini', 'मिनी ट्रक'],
  },
  {
    id: 'tata_ace',
    label: 'Tata Ace',
    labelHi: 'टाटा एस',
    baseFare: 250,
    perKmRate: 16,
    capacity: 'Up to 0.75 ton',
    keywords: ['tata ace', 'ace', 'chhota hati', 'टाटा एस'],
  },
  {
    id: 'bolero_pickup',
    label: 'Bolero Pickup',
    labelHi: 'बोलेरो पिकअप',
    baseFare: 350,
    perKmRate: 20,
    capacity: 'Up to 1.5 ton',
    keywords: ['bolero pickup', 'bolero', 'pickup', 'बोलेरो'],
  },
  {
    id: 'eicher_14ft',
    label: '14ft Eicher',
    labelHi: '14ft आयशर',
    baseFare: 600,
    perKmRate: 28,
    capacity: 'Up to 4 ton',
    keywords: ['14ft eicher', 'eicher', '14ft', 'आयशर', '14 feet'],
  },
  {
    id: 'container_20ft',
    label: '20ft Container',
    labelHi: '20ft कंटेनर',
    baseFare: 1000,
    perKmRate: 38,
    capacity: 'Up to 10 ton',
    keywords: ['20ft container', 'container', '20ft', 'कंटेनर', '20 feet'],
  },
];

export function getVehicle(id: VehicleType): VehicleOption {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

/** Filter vehicles by a free-text search query across label + keywords. */
export function searchVehicles(query: string): VehicleOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return VEHICLES;
  return VEHICLES.filter(
    (v) =>
      v.label.toLowerCase().includes(q) ||
      v.labelHi.includes(query.trim()) ||
      v.keywords.some((k) => k.toLowerCase().includes(q))
  );
}

export function computeFare(
  vehicle: VehicleOption,
  distanceKm: number
): { baseFare: number; perKmRate: number; totalFare: number } {
  const totalFare = Math.round(vehicle.baseFare + vehicle.perKmRate * distanceKm);
  return { baseFare: vehicle.baseFare, perKmRate: vehicle.perKmRate, totalFare };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
