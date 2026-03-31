// =============================================
//  EMO MEMORY — Service Worker
//  動的キャッシュ戦略（Cache First + Network Fallback）
// =============================================

const CACHE_NAME = 'emo-memory-v1';

// 起動時に必ずキャッシュする静的ファイル
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './images/emomemory_bg.png',
  './images/icon-192.png',
  './images/icon-512.png',
];

// ── インストール：静的ファイルをプリキャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // 即座に有効化
});

// ── アクティベート：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // 開いているページをすぐ制御下に
});

// ── フェッチ：Cache First → Network → キャッシュに保存 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts など外部リクエストはネットワーク優先（失敗してもOK）
  if (!url.origin.includes(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // 同一オリジンのリクエスト：キャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // キャッシュにない → ネットワークから取得してキャッシュに追加
      return fetch(event.request).then(response => {
        // 正常なレスポンスだけキャッシュする
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // オフラインでキャッシュもない場合 → index.html を返す（フォールバック）
        return caches.match('./index.html');
      });
    })
  );
});
