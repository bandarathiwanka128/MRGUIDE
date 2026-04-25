/**
 * Service Worker registration helper.
 * Call register() in index.js to enable PWA features.
 * Call unregister() to opt out.
 */

const SW_URL = `${process.env.PUBLIC_URL}/sw.js`;

export function register(config) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SW] Service worker skipped in development mode.');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported in this browser.');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SW_URL)
      .then((registration) => {
        console.log('[SW] Registered — scope:', registration.scope);

        // New content available — notify user
        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.onstatechange = () => {
            if (installing.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[SW] New version available. Refresh to update.');
                if (config?.onUpdate) config.onUpdate(registration);
              } else {
                console.log('[SW] App cached for offline use.');
                if (config?.onSuccess) config.onSuccess(registration);
              }
            }
          };
        };
      })
      .catch((err) => console.error('[SW] Registration failed:', err));
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.unregister())
      .catch((err) => console.error('[SW] Unregister failed:', err));
  }
}
