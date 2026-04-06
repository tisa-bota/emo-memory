// デプロイ時にこの日付だけ更新すればOK（sw.js自体のバージョンは不要）
const CACHE_VERSION = '202604060624';
const CACHE_NAME = 'emo-memory-' + CACHE_VERSION;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './images/emomemory_bg.png',
  './images/icon-192.png',
  './images/icon-512.png',
];

// インストール：静的アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // 古いSWを待たずに即座に有効化
  self.skipWaiting();
});

// 有効化：古いキャッシュを全削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// フェッチ：ネットワーク優先、失敗時にキャッシュ
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(res => {
        // 成功したらキャッシュにも保存（GETのみ）
        if (event.request.method === 'GET' && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
