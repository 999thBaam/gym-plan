const CACHE = 'split5-v2';
const CORE = ['./', './index.html', './diet.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isDoc = req =>
  req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

const putInCache = (req, res) => {
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(req, copy));
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // Pages: network FIRST, so a new deploy shows up on the very next load.
  // Cache is only the offline fallback. (Cache-first here is what kept the
  // old 6-day plan on screen after the 5-day split went live.)
  if (isDoc(req)) {
    e.respondWith(
      fetch(req)
        .then(res => (res.ok ? putInCache(req, res) : res))
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Photos, icons, manifest: cache first — they never change without a new filename.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => (res.ok ? putInCache(req, res) : res)))
  );
});
