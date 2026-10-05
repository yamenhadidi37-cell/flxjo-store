/**
 * FLEXJO VIP - Smart Web Service Worker Ad & Pop-up Blocker
 * Intercepts outgoing HTTP/HTTPS fetch requests on the web client
 * and returns zero-byte clean responses for known ad networks, trackers, and popunders.
 */

const AD_PATTERNS = [
  'popunder',
  'adserver',
  'ads.js',
  'banner_ad',
  'doubleclick',
  'adnxs',
  'exoclick',
  'propellerads',
  'popads',
  'adsterra',
  'clickadu',
  'syndication',
  'trafficjunky',
  'juicyads',
  'hilltopads',
  'monetag',
  'onclickads',
  'adservice',
  'pagead',
  'partner.google',
  'ad-delivery',
  'bet365',
  '1xbet',
  'melbet',
  'linebet',
  'mostbet',
  'adsystem',
  'popup.js',
  'richmedia',
];

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old workers to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url.toLowerCase();

  // Check if requested resource matches known ad/popunder patterns
  const isAd = AD_PATTERNS.some((pattern) => requestUrl.includes(pattern));

  if (isAd) {
    // If this was an ad popup navigation, auto-close the tab instantly
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
      event.respondWith(
        new Response(
          '<!DOCTYPE html><html><head><title>Closing...</title><script>window.close();</script></head><body></body></html>',
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/html' },
          }
        )
      );
      return;
    }

    // Return empty 200 OK zero-byte response to cleanly silence scripts, banners, and beacons
    event.respondWith(
      new Response('', {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/plain',
          'X-FlexJo-Shield': 'Neutralized',
        },
      })
    );
    return;
  }

  // Allow clean video stream segments, HLS chunks, styles, and legitimate APIs
  event.respondWith(fetch(event.request));
});
