const CACHE_NAME = "field-trial-platform-v20261127-02";
const BASE_PATH = "/field-trial-platform/";

const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}platform.html`,
  `${BASE_PATH}platform.js`,
  `${BASE_PATH}Sitios_test.csv`,

  `${BASE_PATH}planting/`,
  `${BASE_PATH}planting/index.html`,
  `${BASE_PATH}planting/planting.css`,
  `${BASE_PATH}planting/planting.js`,
  `${BASE_PATH}planting/planting-offline.js`,

  `${BASE_PATH}harvesting/`,
  `${BASE_PATH}harvesting/index.html`,
  `${BASE_PATH}harvesting/harvesting.css`,
  `${BASE_PATH}harvesting/harvesting.js`,
  `${BASE_PATH}harvesting/harvesting-offline.js`,

  `${BASE_PATH}viewer.html`,
  `${BASE_PATH}offline.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}manifest-viewer.webmanifest`,
  `${BASE_PATH}manifest-selector.js`,

  `${BASE_PATH}style.css`,
  `${BASE_PATH}summary-toolbar.css`,
  `${BASE_PATH}foto-access-addon.css`,
  `${BASE_PATH}popup-mobile-addon.css`,
  `${BASE_PATH}drop-trial-addon.css`,
  `${BASE_PATH}filtros-dependientes-v3.css`,
  `${BASE_PATH}field-photo-capture.css`,
  `${BASE_PATH}field-photo-history.css`,
  `${BASE_PATH}field-coordinate-capture.css`,
  `${BASE_PATH}field-coordinate-pending.css`,
  `${BASE_PATH}field-coordinate-sync-ui.css`,
  `${BASE_PATH}pwa-ui.css`,
  `${BASE_PATH}header-app.css`,

  `${BASE_PATH}app-mode.js`,
  `${BASE_PATH}app-viewer-controls.js`,
  `${BASE_PATH}app.js`,
  `${BASE_PATH}field-access-status.js`,
  `${BASE_PATH}drop-trial-addon.js`,
  `${BASE_PATH}summary-toolbar.js`,
  `${BASE_PATH}foto-access-addon.js`,
  `${BASE_PATH}popup-mobile-addon.js`,
  `${BASE_PATH}filtros-dependientes-v3.js`,
  `${BASE_PATH}field-photo-capture.js`,
  `${BASE_PATH}field-photo-popup-integration.js`,
  `${BASE_PATH}field-photo-sync.js`,
  `${BASE_PATH}field-photo-pending.js`,
  `${BASE_PATH}field-photo-sync-ui.js`,
  `${BASE_PATH}field-photo-history.js`,
  `${BASE_PATH}field-photo-history-ui.js`,
  `${BASE_PATH}field-photo-history-viewer.js`,
  `${BASE_PATH}field-photo-timeline-icons.js`,
  `${BASE_PATH}field-coordinate-storage.js`,
  `${BASE_PATH}field-coordinate-capture.js`,
  `${BASE_PATH}field-coordinate-popup-integration.js`,
  `${BASE_PATH}field-coordinate-pending.js`,
  `${BASE_PATH}field-coordinate-sync.js`,
  `${BASE_PATH}field-coordinate-sync-ui.js`,
  `${BASE_PATH}pwa-ui.js`,

  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}apple-touch-icon.png`
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cachea cada recurso por separado. Un archivo opcional faltante no impide
      // instalar el Service Worker completo.
      await Promise.allSettled(
        APP_SHELL.map(recurso => cache.add(new Request(recurso, { cache: "reload" })))
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    const claveNavegacion = url.pathname;

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar la pagina");
          }

          const copia = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(claveNavegacion, copia);
            })
          );

          return response;
        })
        .catch(async () => {
          const paginaSolicitada = await caches.match(
            claveNavegacion,
            { ignoreSearch: true }
          );

          if (paginaSolicitada) {
            return paginaSolicitada;
          }

          if (url.pathname === `${BASE_PATH}planting/`) {
            const paginaPlanting = await caches.match(
              `${BASE_PATH}planting/index.html`
            );
            if (paginaPlanting) {
              return paginaPlanting;
            }
          }

          if (url.pathname === `${BASE_PATH}harvesting/`) {
            const paginaHarvesting = await caches.match(
              `${BASE_PATH}harvesting/index.html`
            );
            if (paginaHarvesting) {
              return paginaHarvesting;
            }
          }

          return (
            (await caches.match(`${BASE_PATH}platform.html`)) ||
            (await caches.match(`${BASE_PATH}offline.html`))
          );
        })
    );
    return;
  }

  if (url.pathname.endsWith("/Sitios_test.csv")) {
    const claveSitios = `${BASE_PATH}Sitios_test.csv`;
    const solicitudCanonica = new Request(claveSitios);

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar Sitios_test.csv");
          }

          const copia = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache =>
              cache.put(solicitudCanonica, copia)
            )
          );

          return response;
        })
        .catch(async () => {
          // Planting y Harvesting agregan ?v=Date.now(). Siempre se busca la
          // copia canonica sin parametros para que los filtros, AOI y puntos
          // puedan cargarse sin conexion.
          const cacheActual = await caches.open(CACHE_NAME);
          return (
            (await cacheActual.match(solicitudCanonica, { ignoreSearch: true })) ||
            (await caches.match(claveSitios, { ignoreSearch: true })) ||
            Response.error()
          );
        })
    );
    return;
  }

  if (url.pathname.endsWith("/AccessPhotos.csv")) {
    const claveFotos = `${BASE_PATH}AccessPhotos.csv`;

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar AccessPhotos.csv");
          }

          const copia = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(claveFotos, copia);
            })
          );

          return response;
        })
        .catch(() => caches.match(claveFotos))
    );
    return;
  }

  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .catch(() => caches.match(request, { ignoreSearch: true }))
    );
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith(".js") || url.pathname.endsWith(".css"))
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar el recurso");
          }

          const copia = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(url.pathname, copia);
            })
          );

          return response;
        })
        .catch(() => {
          return caches.match(url.pathname, { ignoreSearch: true });
        })
    );
    return;
  }

  if (
    url.pathname.includes("/images/access/") ||
    url.pathname.includes("/images/trial/")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible descargar la fotografia");
          }

          const copia = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(request, copia);
            })
          );

          return response;
        })
        .catch(() => {
          return caches.match(request, { ignoreSearch: true });
        })
    );
    return;
  }

  event.respondWith(
    caches
      .match(request, { ignoreSearch: true })
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(response => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }

          const copia = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(request, copia);
            })
          );

          return response;
        });
      })
  );
});
