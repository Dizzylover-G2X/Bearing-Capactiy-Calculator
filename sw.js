const CACHE_NAME = 'bearing-calc-v3'; // 버전을 v3으로 올립니다.
const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.json'
];

self.addEventListener('install', (evt) => {
    self.skipWaiting(); // 대기하지 않고 즉시 최신 버전 적용
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
});

// ★ 폰에 남아있는 옛날 좀비 캐시(빈 화면)를 완벽히 삭제하는 마법의 코드
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key); // 옛날 캐시 삭제!
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
    evt.respondWith(
        caches.match(evt.request).then((response) => response || fetch(evt.request))
    );
});
