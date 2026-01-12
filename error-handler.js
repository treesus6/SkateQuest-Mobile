// Automatic Error Handler and Bug Fixer for SkateQuest
// This runs continuously and fixes common issues automatically

(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
    AUTO_RECONNECT: true,
    LOG_ERRORS: true,
  };

  // Error tracking
  const errorLog = [];
  const recoveryAttempts = new Map();

  // Utility: Safe logger
  function log(message, type = 'info', data = null) {
    if (!CONFIG.LOG_ERRORS) return;
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message, data };
    errorLog.push(logEntry);
    console[type === 'error' ? 'error' : 'log'](
      `[SkateQuest ${type.toUpperCase()}] ${message}`,
      data || ''
    );

    // Keep only last 100 errors
    if (errorLog.length > 100) errorLog.shift();
  }

  // Global error handler
  window.addEventListener('error', event => {
    log(`Global error: ${event.message}`, 'error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Auto-fix common errors
    handleCommonError(event.message, event);

    // Prevent default error handling in some cases
    if (shouldSuppressError(event.message)) {
      event.preventDefault();
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', event => {
    log(`Unhandled promise rejection: ${event.reason}`, 'error', event.reason);

    // Auto-fix promise rejections
    handlePromiseRejection(event.reason);
    event.preventDefault();
  });

  // Check if error should be suppressed
  function shouldSuppressError(message) {
    const suppressPatterns = [/ResizeObserver/i, /Non-Error promise rejection/i];
    return suppressPatterns.some(pattern => pattern.test(message));
  }

  // Handle common errors
  function handleCommonError(message, event) {
    // Firebase connection errors
    if (message.includes('Firebase') || message.includes('auth')) {
      log('Detected Firebase error, attempting recovery...', 'warn');
      recoverFirebase();
    }

    // Map errors
    if (message.includes('map') || message.includes('Leaflet')) {
      log('Detected map error, attempting recovery...', 'warn');
      recoverMap();
    }

    // Network errors
    if (message.includes('fetch') || message.includes('network')) {
      log('Detected network error, will retry...', 'warn');
      // Network errors are handled by retry mechanisms
    }

    // Storage errors
    if (message.includes('storage') || message.includes('quota')) {
      log('Detected storage error, clearing old data...', 'warn');
      clearOldStorageData();
    }
  }

  // Handle promise rejections
  function handlePromiseRejection(reason) {
    const reasonStr = reason?.toString() || '';

    if (reasonStr.includes('permission') || reasonStr.includes('denied')) {
      log('Permission denied, requesting user action...', 'warn');
      showUserFriendlyError('Please enable required permissions in your browser settings.');
    }

    if (reasonStr.includes('quota') || reasonStr.includes('storage')) {
      clearOldStorageData();
    }
  }

  // Firebase recovery
  async function recoverFirebase() {
    const key = 'firebase';
    if (recoveryAttempts.get(key) >= CONFIG.MAX_RETRIES) {
      log('Max Firebase recovery attempts reached', 'error');
      return;
    }

    recoveryAttempts.set(key, (recoveryAttempts.get(key) || 0) + 1);

    try {
      log('Attempting Firebase reconnection...', 'info');

      // Wait before retry
      await sleep(CONFIG.RETRY_DELAY);

      // Check if Firebase is available
      if (!window.firebaseInstances) {
        log('Firebase instances not available, waiting for initialization...', 'warn');
        await waitForFirebase();
      }

      // Try to re-authenticate
      if (window.firebaseInstances?.auth && window.firebaseInstances?.signInAnonymously) {
        const user = window.firebaseInstances.auth.currentUser;
        if (!user) {
          log('Re-authenticating user...', 'info');
          await window.firebaseInstances.signInAnonymously(window.firebaseInstances.auth);
          log('Firebase re-authentication successful', 'info');
        }
      }

      // Reset retry counter on success
      recoveryAttempts.set(key, 0);
    } catch (error) {
      log('Firebase recovery failed', 'error', error);
      // Will retry on next error
    }
  }

  // Wait for Firebase to initialize
  function waitForFirebase(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (window.firebaseInstances) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error('Firebase initialization timeout'));
        }
      }, 100);
    });
  }

  // Map recovery
  function recoverMap() {
    const key = 'map';
    if (recoveryAttempts.get(key) >= CONFIG.MAX_RETRIES) {
      log('Max map recovery attempts reached', 'error');
      return;
    }

    recoveryAttempts.set(key, (recoveryAttempts.get(key) || 0) + 1);

    try {
      log('Attempting map recovery...', 'info');

      // Check if Leaflet is loaded
      if (typeof L === 'undefined') {
        log('Leaflet not loaded, reloading page...', 'warn');
        setTimeout(() => location.reload(), 2000);
        return;
      }

      // Check if map container exists
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        log('Map container not found', 'error');
        return;
      }

      // Try to invalidate size (fixes rendering issues)
      if (window.map && window.map.invalidateSize) {
        window.map.invalidateSize();
        log('Map size invalidated successfully', 'info');
      }

      recoveryAttempts.set(key, 0);
    } catch (error) {
      log('Map recovery failed', 'error', error);
    }
  }

  // Clear old storage data
  function clearOldStorageData() {
    try {
      log('Clearing old storage data...', 'info');

      // Clear old localStorage items (keep user preferences)
      const keysToKeep = ['userId', 'userPreferences', 'theme'];
      const allKeys = Object.keys(localStorage);

      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const data = JSON.parse(item);
              // Remove items older than 7 days
              if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(key);
                log(`Removed old storage item: ${key}`, 'info');
              }
            } catch {
              // Not JSON, skip
            }
          }
        }
      });

      // Clear cache if available
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('old') || name.includes('v1')) {
              caches.delete(name);
              log(`Deleted old cache: ${name}`, 'info');
            }
          });
        });
      }

      log('Storage cleanup completed', 'info');
    } catch (error) {
      log('Storage cleanup failed', 'error', error);
    }
  }

  // Show user-friendly error
  function showUserFriendlyError(message) {
    // Try to use existing modal
    if (window.showModal && typeof window.showModal === 'function') {
      window.showModal(message);
    } else {
      // Fallback to alert
      alert(message);
    }
  }

  // Sleep utility
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry wrapper for async functions
  window.retryAsync = async function (
    fn,
    retries = CONFIG.MAX_RETRIES,
    delay = CONFIG.RETRY_DELAY
  ) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        log(`Retry attempt ${i + 1}/${retries} failed`, 'warn', error);
        if (i === retries - 1) throw error;
        await sleep(delay * (i + 1)); // Exponential backoff
      }
    }
  };

  // Health check system
  class HealthMonitor {
    constructor() {
      this.checks = [];
      this.status = 'healthy';
      this.lastCheck = null;
    }

    addCheck(name, checkFn) {
      this.checks.push({ name, checkFn });
    }

    async runChecks() {
      log('Running health checks...', 'info');
      const results = [];

      for (const check of this.checks) {
        try {
          const result = await check.checkFn();
          results.push({ name: check.name, status: result ? 'pass' : 'fail' });
        } catch (error) {
          results.push({ name: check.name, status: 'error', error });
          log(`Health check failed: ${check.name}`, 'error', error);
        }
      }

      this.lastCheck = Date.now();
      const failedChecks = results.filter(r => r.status !== 'pass');
      this.status = failedChecks.length === 0 ? 'healthy' : 'degraded';

      if (failedChecks.length > 0) {
        log(`Health check: ${failedChecks.length} checks failed`, 'warn', failedChecks);
        this.attemptRecovery(failedChecks);
      }

      return results;
    }

    attemptRecovery(failedChecks) {
      failedChecks.forEach(check => {
        if (check.name.includes('Firebase')) recoverFirebase();
        if (check.name.includes('Map')) recoverMap();
      });
    }

    start() {
      setInterval(() => this.runChecks(), CONFIG.HEALTH_CHECK_INTERVAL);
      log('Health monitor started', 'info');
    }
  }

  // Initialize health monitor
  const healthMonitor = new HealthMonitor();

  // Add health checks
  healthMonitor.addCheck('Firebase Connection', () => {
    return window.firebaseInstances && window.firebaseInstances.auth;
  });

  healthMonitor.addCheck('Firebase Auth', () => {
    return window.firebaseInstances?.auth?.currentUser !== null;
  });

  healthMonitor.addCheck('Map Initialized', () => {
    return window.map && typeof window.map.getCenter === 'function';
  });

  healthMonitor.addCheck('DOM Ready', () => {
    return document.getElementById('map') !== null;
  });

  // Start health monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      healthMonitor.start();
    });
  } else {
    healthMonitor.start();
  }

  // Expose health monitor globally
  window.healthMonitor = healthMonitor;

  // Network request interceptor (auto-retry failed requests)
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    return window.retryAsync(async () => {
      const response = await originalFetch.apply(this, args);
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    });
  };

  // Firebase operation wrapper (auto-retry)
  window.firebaseRetry = async function (operation, operationName = 'Firebase operation') {
    return window.retryAsync(async () => {
      try {
        return await operation();
      } catch (error) {
        log(`${operationName} failed, retrying...`, 'warn', error);
        throw error;
      }
    });
  };

  // Auto-fix common DOM issues
  function fixDOMIssues() {
    // Ensure critical elements exist
    const criticalElements = ['map', 'content', 'customModal'];

    criticalElements.forEach(id => {
      if (!document.getElementById(id)) {
        log(`Critical element missing: ${id}`, 'error');
        // Could create placeholder or show error to user
      }
    });
  }

  // Run DOM fixes when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixDOMIssues);
  } else {
    fixDOMIssues();
  }

  // Service Worker error recovery
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('error', error => {
      log('Service Worker error detected', 'error', error);
      // Could unregister and re-register service worker if needed
    });
  }

  // Visibility change handler (recover when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      log('Tab became visible, running health check...', 'info');
      healthMonitor.runChecks();
    }
  });

  // Online/offline handlers
  window.addEventListener('online', () => {
    log('Connection restored, recovering services...', 'info');
    recoverFirebase();
    healthMonitor.runChecks();
  });

  window.addEventListener('offline', () => {
    log('Connection lost, app will retry when online', 'warn');
    showUserFriendlyError('Connection lost. Your data will sync when back online.');
  });

  // Expose error log for debugging
  window.getErrorLog = () => errorLog;
  window.clearErrorLog = () => (errorLog.length = 0);

  log('SkateQuest Error Handler initialized successfully', 'info');
})();
