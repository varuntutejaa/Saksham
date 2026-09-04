import * as Location from 'expo-location';

export interface ResolvedLocation {
  state?: string;
  district?: string;
}

/**
 * Ask for foreground location permission, get a one-shot coarse fix, and
 * reverse-geocode it to a state/district — good enough to rank nearby PM-AJAY
 * programmes without needing the user to type anything.
 *
 * Returns `null` if permission is denied or location can't be resolved; the
 * app falls back to no location filter in that case (never blocks the flow).
 */
export async function resolveDeviceLocation(): Promise<ResolvedLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // nearest-km is plenty for state/district
    });

    const [address] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    if (!address) return null;

    return {
      state: address.region ?? undefined,
      district: address.subregion ?? address.district ?? address.city ?? undefined,
    };
  } catch {
    return null;
  }
}
