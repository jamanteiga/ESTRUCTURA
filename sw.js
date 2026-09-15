// Service worker mínimo — su única función es cumplir el requisito
// técnico para que el navegador considere la app "instalable".
// No guarda nada offline a propósito: esta app depende de datos en
// vivo de Supabase, así que un caché agresivo haría más mal que bien
// (mostraría datos viejos como si fueran los actuales).

self.addEventListener('install', (evento) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  self.clients.claim();
});

// Deja pasar todas las peticiones tal cual, sin interceptarlas.
self.addEventListener('fetch', (evento) => {
  return;
});
