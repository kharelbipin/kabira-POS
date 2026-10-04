import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AdminStoreProvider } from './contexts/AdminStoreContext';

/**
 * Remove legacy PWA/service-worker caching.
 *
 * KaBiRa POS is served locally by the Windows POS backend, so we do not
 * want an old PWA service worker serving stale HTML, JavaScript, or CSS
 * after a new installer/build is installed.
 */
async function cleanupLegacyPwa(): Promise<boolean> {
  try {
    const reloadKey = 'kabira-sw-cleanup-reload';

    let wasControlledByServiceWorker = false;

    if ('serviceWorker' in navigator) {
      wasControlledByServiceWorker = Boolean(
        navigator.serviceWorker.controller
      );

      const registrations =
        await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map(registration =>
          registration.unregister()
        )
      );
    }

    // Clear Cache Storage created by the old Vite PWA / Workbox service worker.
    // This does NOT remove localStorage POS settings or transaction data.
    if ('caches' in window) {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(cacheName =>
          caches.delete(cacheName)
        )
      );
    }

    /*
     * If this page was still controlled by the old service worker,
     * reload once after unregistering it. The next request will come
     * directly from the KaBiRa POS server instead of the stale PWA cache.
     */
    if (
      wasControlledByServiceWorker &&
      sessionStorage.getItem(reloadKey) !== '1'
    ) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
      return false;
    }

    sessionStorage.removeItem(reloadKey);
  } catch (error) {
    console.warn(
      '[KaBiRa POS] Legacy service-worker cleanup failed:',
      error
    );
  }

  return true;
}

async function startKabiraPos() {
  const canStart = await cleanupLegacyPwa();

  if (!canStart) {
    return;
  }

  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error(
      'KaBiRa POS could not start because the root element was not found.'
    );
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AdminStoreProvider>
        <App />
      </AdminStoreProvider>
    </StrictMode>
  );
}

void startKabiraPos();
