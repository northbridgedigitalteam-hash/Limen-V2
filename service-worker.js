// Service Worker for PWA functionality
const CACHE_NAME = 'limen-v1.3.0';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/stateEngine.js',
    '/interventions.js',
    '/storage.js',
    '/push.js',
    '/audio.js',
    '/environment.js',
    '/manifest.json',
    '/browserconfig.xml',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('All assets cached');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    // For same-origin requests, try cache first
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    return fetch(event.request)
                        .then(response => {
                            // Don't cache if not a success response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            // Clone the response
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            return response;
                        })
                        .catch(() => {
                            // If fetch fails and this is a page navigation, return offline page
                            if (event.request.mode === 'navigate') {
                                return caches.match('/index.html');
                            }
                            return new Response('Network error', {
                                status: 408,
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
    }
});

// Push event - handle push notifications
self.addEventListener('push', event => {
    console.log('Push event received:', event);
    
    let data = {
        title: 'LIMEN',
        body: 'Time to regulate.',
        icon: 'icon-192.png',
        badge: 'icon-192.png'
    };
    
    if (event.data) {
        try {
            const eventData = event.data.json();
            data = { ...data, ...eventData };
        } catch (e) {
            // If data is text, use it as body
            data.body = event.data.text() || data.body;
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || 'icon-192.png',
        badge: data.badge || 'icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            timestamp: Date.now()
        },
        tag: 'limen-notification',
        renotify: false,
        requireInteraction: false,
        silent: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event.notification.tag);
    event.notification.close();
    
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(clientList => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Background sync example (future feature)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-sessions') {
        console.log('Background sync triggered');
        event.waitUntil(syncSessions());
    }
});

async function syncSessions() {
    // Future: Sync session data with server
    console.log('Syncing sessions...');
    return Promise.resolve();
}
