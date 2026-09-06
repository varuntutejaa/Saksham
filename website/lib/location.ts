"use client";

export interface ResolvedLocation {
  state?: string;
  district?: string;
}

/**
 * Browser Geolocation API + free reverse-geocoding (BigDataCloud's
 * client-side endpoint, no API key) — the web equivalent of the app's
 * expo-location + reverse geocode. Returns null on denial/failure; callers
 * never block the flow on this.
 */
export async function resolveDeviceLocation(): Promise<ResolvedLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
    );
    const { latitude, longitude } = position.coords;
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      state: data.principalSubdivision ?? undefined,
      district: data.locality ?? data.city ?? undefined,
    };
  } catch {
    return null;
  }
}
