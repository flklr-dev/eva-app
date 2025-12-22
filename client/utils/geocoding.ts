/**
 * Geocoding utilities for converting coordinates to human-readable addresses
 */

interface GeocodingResult {
  city?: string;
  province?: string;
  country?: string;
  displayName: string;
}

// Cache for geocoding results to avoid repeated API calls
const geocodingCache = new Map<string, GeocodingResult>();

/**
 * Get a cache key for coordinates (rounded to 3 decimal places for ~100m precision)
 */
const getCacheKey = (lat: number, lng: number): string => {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
};

/**
 * Reverse geocode coordinates to get place name using OpenStreetMap Nominatim API
 * Free, no API key required, but rate limited to 1 request per second
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeocodingResult> => {
  const cacheKey = getCacheKey(latitude, longitude);
  
  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    // Use Nominatim (OpenStreetMap) - free and no API key required
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EVA-Alert-App', // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract address components
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.municipality;
    const province = address.state || address.province || address.region;
    const country = address.country;

    // Create display name (prioritize city, then province, then country)
    let displayName = 'Unknown Location';
    if (city && province) {
      displayName = `${city}, ${province}`;
    } else if (city) {
      displayName = city;
    } else if (province && country) {
      displayName = `${province}, ${country}`;
    } else if (province) {
      displayName = province;
    } else if (country) {
      displayName = country;
    }

    const result: GeocodingResult = {
      city,
      province,
      country,
      displayName,
    };

    // Cache the result
    geocodingCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('[Geocoding] Error reverse geocoding:', error);
    
    // Return fallback with coordinates
    const fallback: GeocodingResult = {
      displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    };
    
    // Cache the fallback to avoid repeated failed requests
    geocodingCache.set(cacheKey, fallback);
    
    return fallback;
  }
};

/**
 * Batch reverse geocode multiple coordinates with rate limiting
 * Processes requests one at a time with 1 second delay between each
 */
export const batchReverseGeocode = async (
  coordinates: Array<{ lat: number; lng: number; id: string }>
): Promise<Map<string, GeocodingResult>> => {
  const results = new Map<string, GeocodingResult>();
  
  for (const coord of coordinates) {
    const cacheKey = getCacheKey(coord.lat, coord.lng);
    
    // Check cache first
    if (geocodingCache.has(cacheKey)) {
      results.set(coord.id, geocodingCache.get(cacheKey)!);
      continue;
    }
    
    // Fetch with rate limiting (1 request per second)
    const result = await reverseGeocode(coord.lat, coord.lng);
    results.set(coord.id, result);
    
    // Wait 1 second before next request (Nominatim rate limit)
    if (coordinates.indexOf(coord) < coordinates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }
  
  return results;
};

/**
 * Clear the geocoding cache (useful for memory management)
 */
export const clearGeocodingCache = (): void => {
  geocodingCache.clear();
};

/**
 * Get cache size
 */
export const getGeocodingCacheSize = (): number => {
  return geocodingCache.size;
};
