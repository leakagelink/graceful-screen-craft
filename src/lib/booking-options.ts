export const GOODS_TYPES = [
  'Building Materials',
  'Event Management / Hospitality',
  'Ceramic / Sanitary Wares',
  'Paints / Chemicals (Non-Hazardous)',
  'Electrical',
  'Furniture',
  'Food & Grocery',
  'Textiles & Garments',
  'Machinery & Spares',
  'Other',
] as const;

export const RESTRICTED_ITEMS = [
  'Narcotics and drugs',
  'Explosives and firearms',
  'Ammunition and fireworks',
  'Hazardous and flammable chemicals',
  'Live animals',
  'Stolen or illegal goods',
] as const;

export const CANCEL_REASONS = [
  'Wrong / Inappropriate Vehicle',
  'My reason is not listed',
  'Driver asked me to cancel',
  'Changed my mind',
  'Driver issue - delaying to come',
  'Unable to contact driver',
  'Expected a shorter arrival time',
  'Driver asking for extra money',
  'Driver not moving',
] as const;
