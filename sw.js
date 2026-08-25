/* Service worker de Semáforo Nutricional.

   Dos objetivos, en este orden de prioridad:

   1. QUE NUNCA QUEDE UNA VERSIÓN VIEJA PEGADA. Las páginas se piden
      siempre a la red primero. La caché es red de emergencia, no la
      fuente. Nos hizo perder horas creyendo que un arreglo no andaba
      cuando el teléfono mostraba código viejo.
   2. Que la app abra sin internet, aunque sin poder consultar productos.

   Las llamadas a /api/ NUNCA se guardan: son datos que cambian y
   mostrar una respuesta vieja sería mentir. */

const VERSION = "v1";
const CACHE = "semaforo-" + VERSION;
const ESENCIALES = ["/", "/index.html", "/manifest.json", "/icono.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ESENCIALES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;   // datos vivos: nunca caché

  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200){
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("/index.html")))
  );
});
