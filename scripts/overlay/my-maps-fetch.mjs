/*
This module owns only the remote-download path for Google My Maps exports.

The goal is to keep all HTTP assumptions in one place:

1. send a request that Google My Maps is willing to answer with KML/KMZ
2. reject obvious bad responses early
3. return a raw buffer for the parser module to consume

Nothing here knows about overlay config, file outputs, or merge logic.
*/

export async function fetchCuratedRoutesBufferFromUrl(sourceUrl, fetchImpl = fetch) {
  const response = await fetchImpl(sourceUrl, {
    headers: {
      Accept: 'application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(
      `Request failed for curated Google My Maps dataset: ${response.status} ${response.statusText}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const prefix = buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase();
  const isKmz = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const looksLikeKml = prefix.startsWith('<?xml') || prefix.startsWith('<kml');
  const isDeclaredKml =
    contentType.includes('xml') ||
    contentType.includes('kml') ||
    contentDisposition.toLowerCase().includes('.kml') ||
    contentDisposition.toLowerCase().includes('.kmz');

  if (!isKmz && !(looksLikeKml && isDeclaredKml)) {
    throw new Error(
      `Expected KML/KMZ from Google My Maps export but received ${contentType || 'an unknown content type'}.`
    );
  }

  if (prefix.startsWith('<!doctype html') || prefix.startsWith('<html')) {
    throw new Error('Google My Maps export returned HTML instead of KML/KMZ.');
  }

  return buffer;
}
