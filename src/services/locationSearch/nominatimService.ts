const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RESULT_LIMIT = 5;

interface NominatimSearchResponseItem {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
}

export interface LocationSearchResult {
  id: string;
  latitude: number;
  longitude: number;
  primaryText: string;
  secondaryText: string;
}

function getPrimaryText(item: NominatimSearchResponseItem) {
  if (item.name?.trim()) {
    return item.name.trim();
  }

  const [firstSegment] = item.display_name.split(',');
  return firstSegment?.trim() || item.display_name.trim();
}

function getSecondaryText(item: NominatimSearchResponseItem, primaryText: string) {
  const displayName = item.display_name.trim();

  if (displayName === primaryText) {
    return 'Singapore';
  }

  const prefix = `${primaryText},`;
  if (displayName.startsWith(prefix)) {
    return displayName.slice(prefix.length).trim();
  }

  return displayName;
}

export async function searchSingaporeLocations(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('q', trimmedQuery);
  url.searchParams.set('countrycodes', 'sg');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(SEARCH_RESULT_LIMIT));

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NominatimSearchResponseItem[];

  return payload.slice(0, SEARCH_RESULT_LIMIT).map((item) => {
    const primaryText = getPrimaryText(item);

    return {
      id: String(item.place_id),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      primaryText,
      secondaryText: getSecondaryText(item, primaryText)
    };
  });
}
