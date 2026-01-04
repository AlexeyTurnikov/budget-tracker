// ===== Service Worker для Budget Tracker =====
// Обеспечивает работу оффлайн через кэширование app shell

const CACHE_VERSION = "budget-v2";
const CACHE_NAME = `${CACHE_VERSION}`;

// Файлы для кэширования (app shell)
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json"
];

// ===== Установка Service Worker =====
self.addEventListener("install", (event) => {
  console.log("[SW] Установка Service Worker, версия:", CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Кэширование app shell");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Принудительная активация нового SW
        return self.skipWaiting();
      })
  );
});

// ===== Активация Service Worker =====
self.addEventListener("activate", (event) => {
  console.log("[SW] Активация Service Worker, версия:", CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Удаляем старые кэши
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Удаление старого кэша:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Берём контроль над всеми страницами
        return self.clients.claim();
      })
  );
});

// ===== Обработка запросов (Cache First стратегия) =====
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Игнорируем не-GET запросы
  if (request.method !== "GET") {
    return;
  }
  
  // Игнорируем запросы к внешним API (Google Sheets, etc)
  const url = new URL(request.url);
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Возвращаем из кэша если есть
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Иначе запрашиваем из сети
        return fetch(request)
          .then((networkResponse) => {
            // Не кэшируем если ответ не валидный
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
              return networkResponse;
            }
            
            // Клонируем ответ для кэширования
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Если сеть недоступна и в кэше нет - возвращаем index.html для SPA
            if (request.mode === "navigate") {
              return caches.match("./index.html");
            }
          });
      })
  );
});

// ===== Обработка сообщений от клиента =====
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

