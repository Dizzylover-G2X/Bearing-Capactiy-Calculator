const CACHE_NAME = 'bearing-calc-v2'; // v1을 v2로 살짝 바꿔주면 폰에서 업데이트를 더 빨리 인식합니다.
const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.json'
];

// 아래 코드는 기존과 동일하게 유지
self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
});

self.addEventListener('fetch', (evt) => {
    evt.respondWith(
        caches.match(evt.request).then((response) => response || fetch(evt.request))
    );
});
