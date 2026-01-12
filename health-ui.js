// Health Status UI - Visual indicator for app health
(function () {
  'use strict';

  // Wait for DOM to be ready
  function initHealthUI() {
    const healthStatus = document.getElementById('health-status');
    const healthIcon = document.getElementById('health-icon');
    const healthText = document.getElementById('health-text');

    if (!healthStatus || !healthIcon || !healthText) {
      console.warn('Health UI elements not found');
      return;
    }

    // Show health indicator
    healthStatus.style.display = 'block';

    // Update health status
    function updateHealthStatus(status, message) {
      const statusConfig = {
        healthy: { bg: '#2a8f2a', text: 'Online', icon: '●' },
        degraded: { bg: '#ff9800', text: 'Limited', icon: '◐' },
        offline: { bg: '#d32f2f', text: 'Offline', icon: '○' },
        connecting: { bg: '#2196F3', text: 'Connecting...', icon: '◌' },
      };

      const config = statusConfig[status] || statusConfig.healthy;
      healthStatus.style.background = config.bg;
      healthIcon.textContent = config.icon;
      healthText.textContent = message || config.text;
    }

    // Listen to health monitor if available
    function attachHealthMonitor() {
      if (window.healthMonitor) {
        // Override the health monitor's runChecks to update UI
        const originalRunChecks = window.healthMonitor.runChecks.bind(window.healthMonitor);
        window.healthMonitor.runChecks = async function () {
          const results = await originalRunChecks();
          updateHealthStatus(this.status);
          return results;
        };

        // Initial check
        window.healthMonitor.runChecks();
      }
    }

    // Network status listeners
    window.addEventListener('online', () => {
      updateHealthStatus('healthy', 'Back Online');
      setTimeout(() => updateHealthStatus('healthy'), 3000);
    });

    window.addEventListener('offline', () => {
      updateHealthStatus('offline', 'No Connection');
    });

    // Firebase auth state listener
    function monitorFirebaseAuth() {
      if (
        window.firebaseInstances &&
        window.firebaseInstances.onAuthStateChanged &&
        window.firebaseInstances.auth
      ) {
        window.firebaseInstances.onAuthStateChanged(window.firebaseInstances.auth, user => {
          if (user) {
            updateHealthStatus('healthy');
          } else {
            updateHealthStatus('connecting');
          }
        });
      }
    }

    // Wait for components to load
    setTimeout(() => {
      attachHealthMonitor();
      monitorFirebaseAuth();
    }, 1000);

    // Expose update function globally
    window.updateHealthStatus = updateHealthStatus;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHealthUI);
  } else {
    initHealthUI();
  }
})();
