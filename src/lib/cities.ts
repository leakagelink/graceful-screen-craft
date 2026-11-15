// Major Maharashtra transport hub cities with coordinates for OSRM routing.
// The list centers on Nagpur as the primary hub and includes the key
// destinations requested plus nearby feeder cities.

export interface City {
  id: string;
  name: string;
  nameHi: string;
  lat: number;
  lng: number;
}

export const NAGPUR: City = {
  id: 'nagpur',
  name: 'Nagpur',
  nameHi: 'नागपूर',
  lat: 21.1458,
  lng: 79.0882,
};

export const MAHARASHTRA_CITIES: City[] = [
  NAGPUR,
  { id: 'nashik', name: 'Nashik', nameHi: 'नाशिक', lat: 19.9975, lng: 73.7898 },
  { id: 'pune', name: 'Pune', nameHi: 'पुणे', lat: 18.5204, lng: 73.8567 },
  { id: 'mumbai', name: 'Mumbai', nameHi: 'मुंबई', lat: 19.076, lng: 72.8777 },
  {
    id: 'chhatrapati-sambhajinagar',
    name: 'Chhatrapati Sambhajinagar',
    nameHi: 'छत्रपती संभाजीनगर',
    lat: 19.8762,
    lng: 75.3433,
  },
  { id: 'amravati', name: 'Amravati', nameHi: 'अमरावती', lat: 20.9374, lng: 77.7796 },
  { id: 'chandrapur', name: 'Chandrapur', nameHi: 'चंद्रपूर', lat: 19.9615, lng: 79.2961 },
  { id: 'wardha', name: 'Wardha', nameHi: 'वर्धा', lat: 20.7453, lng: 78.6022 },
  { id: 'bhandara', name: 'Bhandara', nameHi: 'भंडारा', lat: 21.47, lng: 79.42 },
  { id: 'yavatmal', name: 'Yavatmal', nameHi: 'यवतमाळ', lat: 20.3899, lng: 78.1317 },
  { id: 'akola', name: 'Akola', nameHi: 'अकोला', lat: 20.7002, lng: 77.0082 },
  { id: 'nanded', name: 'Nanded', nameHi: 'नांदेड', lat: 19.1383, lng: 77.321 },
  { id: 'kolhapur', name: 'Kolhapur', nameHi: 'कोल्हापूर', lat: 16.705, lng: 74.2433 },
  { id: 'nagpur2', name: 'Nagpur', nameHi: 'नागपूर', lat: 21.1458, lng: 79.0882 },
];

// Deduplicate by id (keeps the first occurrence).
export const CITIES: City[] = Array.from(
  MAHARASHTRA_CITIES.reduce((m, c) => {
    if (!m.has(c.id)) m.set(c.id, c);
    return m;
  }, new Map<string, City>())
  .values()
);

export function findCityByName(name: string): City | undefined {
  const n = name.trim().toLowerCase();
  return CITIES.find((c) => c.name.toLowerCase() === n);
}

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  return CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.nameHi.includes(query.trim())
  ).slice(0, limit);
}
