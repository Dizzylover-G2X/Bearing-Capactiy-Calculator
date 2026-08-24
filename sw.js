// 기존 v3을 v4로 변경합니다. (이 숫자만 바뀌어도 앱이 새 디자인을 자동으로 다운로드합니다)
const CACHE_NAME = 'bearing-calc-v4'; 
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
