export interface NigerianStateInfo {
  name: string;
  capital: string;
  zone: 'South West' | 'South South' | 'South East' | 'North Central' | 'North West' | 'North East';
  lat: number;
  lng: number;
}

export const NIGERIAN_STATES: string[] = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const TOP_COMMERCIAL_STATES: string[] = [
  'Lagos', 'FCT Abuja', 'Rivers', 'Oyo', 'Kano', 'Anambra', 'Ogun', 'Delta', 'Enugu', 'Edo', 'Kaduna'
];

export const NIGERIAN_STATE_DETAILS: Record<string, NigerianStateInfo> = {
  'Abia': { name: 'Abia', capital: 'Umuahia', zone: 'South East', lat: 5.4527, lng: 7.5248 },
  'Adamawa': { name: 'Adamawa', capital: 'Yola', zone: 'North East', lat: 9.3265, lng: 12.3984 },
  'Akwa Ibom': { name: 'Akwa Ibom', capital: 'Uyo', zone: 'South South', lat: 5.0377, lng: 7.9128 },
  'Anambra': { name: 'Anambra', capital: 'Awka', zone: 'South East', lat: 6.2209, lng: 7.0719 },
  'Bauchi': { name: 'Bauchi', capital: 'Bauchi', zone: 'North East', lat: 10.3158, lng: 9.8442 },
  'Bayelsa': { name: 'Bayelsa', capital: 'Yenagoa', zone: 'South South', lat: 4.7719, lng: 6.0699 },
  'Benue': { name: 'Benue', capital: 'Makurdi', zone: 'North Central', lat: 7.7304, lng: 8.5392 },
  'Borno': { name: 'Borno', capital: 'Maiduguri', zone: 'North East', lat: 11.8333, lng: 13.1500 },
  'Cross River': { name: 'Cross River', capital: 'Calabar', zone: 'South South', lat: 5.8702, lng: 8.5988 },
  'Delta': { name: 'Delta', capital: 'Asaba', zone: 'South South', lat: 5.5325, lng: 5.8987 },
  'Ebonyi': { name: 'Ebonyi', capital: 'Abakaliki', zone: 'South East', lat: 6.2649, lng: 8.0137 },
  'Edo': { name: 'Edo', capital: 'Benin City', zone: 'South South', lat: 6.5244, lng: 5.8987 },
  'Ekiti': { name: 'Ekiti', capital: 'Ado-Ekiti', zone: 'South West', lat: 7.6656, lng: 5.2599 },
  'Enugu': { name: 'Enugu', capital: 'Enugu', zone: 'South East', lat: 6.4584, lng: 7.5464 },
  'FCT Abuja': { name: 'FCT Abuja', capital: 'Abuja', zone: 'North Central', lat: 9.0765, lng: 7.3986 },
  'Gombe': { name: 'Gombe', capital: 'Gombe', zone: 'North East', lat: 10.2897, lng: 11.1712 },
  'Imo': { name: 'Imo', capital: 'Owerri', zone: 'South East', lat: 5.4836, lng: 7.0332 },
  'Jigawa': { name: 'Jigawa', capital: 'Dutse', zone: 'North West', lat: 12.2280, lng: 9.5616 },
  'Kaduna': { name: 'Kaduna', capital: 'Kaduna', zone: 'North West', lat: 10.5105, lng: 7.4165 },
  'Kano': { name: 'Kano', capital: 'Kano', zone: 'North West', lat: 12.0022, lng: 8.5920 },
  'Katsina': { name: 'Katsina', capital: 'Katsina', zone: 'North West', lat: 12.9908, lng: 7.6018 },
  'Kebbi': { name: 'Kebbi', capital: 'Birnin Kebbi', zone: 'North West', lat: 12.4504, lng: 4.1999 },
  'Kogi': { name: 'Kogi', capital: 'Lokoja', zone: 'North Central', lat: 7.7969, lng: 6.7407 },
  'Kwara': { name: 'Kwara', capital: 'Ilorin', zone: 'North Central', lat: 8.9669, lng: 4.6000 },
  'Lagos': { name: 'Lagos', capital: 'Ikeja', zone: 'South West', lat: 6.5244, lng: 3.3792 },
  'Nasarawa': { name: 'Nasarawa', capital: 'Lafia', zone: 'North Central', lat: 8.5379, lng: 8.3200 },
  'Niger': { name: 'Niger', capital: 'Minna', zone: 'North Central', lat: 9.9309, lng: 5.5983 },
  'Ogun': { name: 'Ogun', capital: 'Abeokuta', zone: 'South West', lat: 7.1475, lng: 3.3619 },
  'Ondo': { name: 'Ondo', capital: 'Akure', zone: 'South West', lat: 7.2571, lng: 5.2058 },
  'Osun': { name: 'Osun', capital: 'Osogbo', zone: 'South West', lat: 7.5629, lng: 4.5200 },
  'Oyo': { name: 'Oyo', capital: 'Ibadan', zone: 'South West', lat: 7.3775, lng: 3.9470 },
  'Plateau': { name: 'Plateau', capital: 'Jos', zone: 'North Central', lat: 9.2182, lng: 9.5179 },
  'Rivers': { name: 'Rivers', capital: 'Port Harcourt', zone: 'South South', lat: 4.8156, lng: 7.0498 },
  'Sokoto': { name: 'Sokoto', capital: 'Sokoto', zone: 'North West', lat: 13.0059, lng: 5.2476 },
  'Taraba': { name: 'Taraba', capital: 'Jalingo', zone: 'North East', lat: 7.8704, lng: 9.7800 },
  'Yobe': { name: 'Yobe', capital: 'Damaturu', zone: 'North East', lat: 12.0000, lng: 11.5000 },
  'Zamfara': { name: 'Zamfara', capital: 'Gusau', zone: 'North West', lat: 12.1222, lng: 6.2236 },
};

/**
 * Calculates distance between two GPS coordinates using Haversine formula in Kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the closest Nigerian state to a given set of latitude and longitude coordinates.
 */
export function getClosestNigerianState(lat: number, lng: number): { state: string; distanceKm: number; info: NigerianStateInfo } {
  let closestState = 'Lagos';
  let minDistance = Infinity;

  for (const [stateName, details] of Object.entries(NIGERIAN_STATE_DETAILS)) {
    const dist = calculateDistanceKm(lat, lng, details.lat, details.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestState = stateName;
    }
  }

  return {
    state: closestState,
    distanceKm: minDistance,
    info: NIGERIAN_STATE_DETAILS[closestState],
  };
}

/**
 * Extract or normalize Nigerian state name from arbitrary address or profile string.
 */
export function extractStateFromLocation(locationString?: string | null): string | null {
  if (!locationString) return null;
  const normalized = locationString.toLowerCase();

  // Special match for Abuja / FCT
  if (normalized.includes('abuja') || normalized.includes('fct')) {
    return 'FCT Abuja';
  }

  // Check against all state names
  for (const state of NIGERIAN_STATES) {
    if (state === 'FCT Abuja') continue;
    const lower = state.toLowerCase();
    const regex = new RegExp(`\\b${lower}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(lower)) {
      return state;
    }
  }

  // Capital matches (e.g., "Port Harcourt" -> Rivers, "Ibadan" -> Oyo, "Ikeja" -> Lagos)
  for (const [stateName, details] of Object.entries(NIGERIAN_STATE_DETAILS)) {
    if (normalized.includes(details.capital.toLowerCase())) {
      return stateName;
    }
  }

  return null;
}

/**
 * Hook or helper to request user's browser geolocation with high accuracy and map to Nigerian state.
 */
export async function detectUserNigerianState(): Promise<{
  state: string;
  coords: { latitude: number; longitude: number };
  distanceKm: number;
} | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const closest = getClosestNigerianState(latitude, longitude);
        resolve({
          state: closest.state,
          coords: { latitude, longitude },
          distanceKm: closest.distanceKm,
        });
      },
      (_err) => {
        resolve(null);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
