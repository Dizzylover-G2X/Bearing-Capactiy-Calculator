const CACHE_NAME = 'bearing-calc-v5';

// 정적 자산(아이콘 등)만 캐싱하고 메인 페이지는 네트워크에서 실시간으로 가져옵니다.
const ASSETS_TO_CACHE = [
    './manifest.json',
    './icon-192.png'
];

// 1. 설치할 때 기본 에셋 저장
self.addEventListener('install', (evt) => {
    self.skipWaiting();
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

// 2. 활성화될 때 예전 버전의 좀비 캐시 자동 청소
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// 3. [핵심] 네트워크 우선(Network-First) 전략 적용
self.addEventListener('fetch', (evt) => {
    // 사용자가 페이지(HTML)를 요청할 때
    if (evt.request.mode === 'navigate' || evt.request.destination === 'document') {
        evt.respondWith(
            fetch(evt.request)
                .then((response) => {
                    // 서버에서 최신 파일을 성공적으로 가져오면 그 즉시 반환
                    return response;
                })
                .catch(() => {
                    // 만약 인터넷이 끊겼다면 안전하게 캐시에 있는 예전 화면을 보여줌
                    return caches.match(evt.request);
                })
        );
    } else {
        // 일반 이미지나 파일은 기존처럼 빠르게 캐시에서 로드
        evt.respondWith(
            caches.match(evt.request).then((response) => response || fetch(evt.request))
        );
    }
});
