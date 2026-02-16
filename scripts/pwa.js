// pwa.js - service worker registration and install prompt handling
(function () {
  let deferredPrompt = null;
  const installBtnId = 'installAppBtn';

  // Expose a small method to create or show the install button
  function showInstallButton() {
    const existing = document.getElementById(installBtnId);
    if (existing) return existing;
    const btn = document.createElement('button');
    btn.id = installBtnId;
    btn.textContent = 'Install App';
    btn.style.position = 'fixed';
    btn.style.right = '1rem';
    btn.style.bottom = '1.5rem';
    btn.style.zIndex = 9999;
    btn.style.background = '#d2673d';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.padding = '.6rem 1rem';
    btn.style.borderRadius = '24px';
    btn.style.boxShadow = '0 6px 14px rgba(0,0,0,0.12)';
    btn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.remove();
      console.log('User install choice', choice);
    };
    document.body.appendChild(btn);
    return btn;
  }

  // Service worker registration for PWA functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(reg => {
          console.log('✓ Service Worker registered', reg.scope);
          // Check for updates periodically
          setInterval(() => {
            reg.update();
          }, 60000); // Check every minute
        })
        .catch(err => console.warn('SW registration failed', err));
    });
  }

  // beforeinstallprompt handling
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Show our custom install button
    showInstallButton();
  });

  // Optional: remove install prompt when app installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const b = document.getElementById(installBtnId);
    if (b) b.remove();
    console.log('App installed');
  });
})();
