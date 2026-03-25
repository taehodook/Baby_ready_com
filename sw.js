// 🍼 아기맞이 준비물 Service Worker
// 버전 바꾸면 캐시 갱신됨
const CACHE_NAME = 'baby-checklist-v1';

// 오프라인에서도 작동할 파일 목록
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@300;400;500;700&display=swap',
];

// ── 설치: 핵심 파일 캐시 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES).catch(err => {
        console.warn('캐시 일부 실패 (무시 가능):', err);
      });
    })
  );
  self.skipWaiting();
});

// ── 활성화: 오래된 캐시 정리 ──
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

// ── 요청 처리: Network First (최신 우선, 실패 시 캐시) ──
self.addEventListener('fetch', event => {
  // Firebase, 쿠팡, 폰트 등 외부 요청은 캐시 안 함
  const url = new URL(event.request.url);
  const isExternal = !url.origin.includes(self.location.origin);
  const isFirebase  = url.hostname.includes('firebase') ||
                      url.hostname.includes('gstatic') ||
                      url.hostname.includes('coupang') ||
                      url.hostname.includes('googleapis');

  if (isFirebase || (isExternal && !url.href.includes('fonts'))) {
    return; // 브라우저 기본 처리
  }

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // 성공하면 캐시 업데이트
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 응답
        return caches.match(event.request).then(cached => {
          return cached || new Response('<h2>오프라인 상태입니다. 인터넷 연결 후 다시 시도해주세요.</h2>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
  );
});
