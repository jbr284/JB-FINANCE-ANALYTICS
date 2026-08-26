const CACHE_NAME = 'jb-finance-v5';
const urlsToCache = [
    './',
    './index.html',
    './calculadora.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-192x192.png',
    './JBFINANCELOGO.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Ativação e limpeza de Caches Antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estratégia "Network First" (Sempre busca o mais recente, fallback para cache se offline)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
