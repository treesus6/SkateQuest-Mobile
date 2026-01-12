// Portal Dimension - Clickable Logo Integration for SkateQuest
// Adds a clickable logo marker at Newport Skatepark with click tracking

(function () {
  'use strict';

  const PortalDimensionSpot = {
    config: {
      companyName: 'Portal Dimension',
      website: 'https://portaldimension.com',
      logoUrl: '/icons/portal-dimension-logo.png',
      location: {
        name: 'Newport Skatepark',
        latitude: 44.6368, // Newport, Oregon
        longitude: -124.0537,
        city: 'Newport',
        state: 'Oregon',
      },
      logoSize: [80, 80],
      enabled: true,
      trackClicks: true,
    },

    marker: null,
    clickStats: {
      totalClicks: 0,
      lastClick: null,
      clicksByDay: {},
    },

    // Initialize Portal Dimension spot
    init: async function () {
      if (!this.config.enabled) {
        console.log('Portal Dimension spot is disabled');
        return;
      }

      // Wait for map to be ready
      await this.waitForMap();

      // Sign-in anonymously if available so cloud function calls are authenticated
      if (
        window.firebaseInstances?.auth &&
        window.firebaseInstances?.signInAnonymously &&
        !window.firebaseInstances.auth.currentUser
      ) {
        try {
          await window.firebaseInstances.signInAnonymously(window.firebaseInstances.auth);
        } catch (e) {
          console.debug('Anon sign-in failed (already signed in?)', e);
        }
      }

      // Load existing stats
      await this.loadStats();

      // Add the marker
      this.addMarker();

      console.log('✓ Portal Dimension spot initialized at Newport Skatepark');
    },

    // Wait for map to be available
    waitForMap: function (timeout = 10000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
          if (window.map || window.skatequestMap) {
            clearInterval(interval);
            resolve();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(new Error('Map not available'));
          }
        }, 100);
      });
    },

    // Add the clickable logo marker
    addMarker: function () {
      const map = window.map || window.skatequestMap;
      if (!map) {
        console.error('Map not available for Portal Dimension marker');
        return;
      }

      // Create custom icon for Portal Dimension
      const portalIcon = L.divIcon({
        className: 'portal-dimension-marker',
        html: `
                    <div class="portal-logo-container" style="
                        width: ${this.config.logoSize[0]}px;
                        height: ${this.config.logoSize[1]}px;
                        border-radius: 50%;
                        background: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 12px rgba(255, 87, 34, 0.6);
                        border: 3px solid #FF5722;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        overflow: hidden;
                    ">
                        <img src="${this.config.logoUrl}" 
                             alt="${this.config.companyName}" 
                             style="width: 90%; height: 90%; object-fit: contain;"/>
                    </div>
                `,
        iconSize: this.config.logoSize,
        iconAnchor: [this.config.logoSize[0] / 2, this.config.logoSize[1] / 2],
      });

      // Create marker
      this.marker = L.marker([this.config.location.latitude, this.config.location.longitude], {
        icon: portalIcon,
        title: this.config.companyName,
        zIndexOffset: 1000, // Keep on top
      }).addTo(map);

      // Create popup content
      const popupContent = `
                <div class="portal-dimension-popup" style="min-width: 250px; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; color: #FF5722;">
                        🛹 ${this.config.companyName}
                    </h3>
                    <p style="margin: 5px 0; color: #666;">
                        <strong>📍 ${this.config.location.name}</strong><br/>
                        ${this.config.location.city}, ${this.config.location.state}
                    </p>
                    <p style="margin: 10px 0; font-size: 14px;">
                        Supporting the local skate community
                    </p>
                    <button 
                        id="portal-visit-btn" 
                        style="
                            background: #FF5722;
                            color: white;
                            padding: 10px 20px;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 14px;
                            margin-top: 10px;
                            width: 100%;
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='#E64A19'"
                        onmouseout="this.style.background='#FF5722'"
                        aria-label="Visit Portal Dimension website"
                        >
                        Visit Website →
                    </button>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
                        Clicks: <span id="portal-clicks-count">${this.clickStats.totalClicks}</span>
                    </p>
                </div>
            `;

      this.marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'portal-dimension-popup-wrapper',
      });

      // Add click handler to marker
      this.marker.on('click', () => {
        // Open popup and setup button handler
        setTimeout(() => {
          const btn = document.getElementById('portal-visit-btn');
          if (btn) {
            // Prevent double-click spamming by disabling for 1.5s
            btn.onclick = async () => {
              if (btn.disabled) return;
              btn.disabled = true;
              await this.handleLogoClick();
              setTimeout(() => (btn.disabled = false), 1500);
            };
          }
        }, 100);
      });

      // Add hover effect
      this.addHoverEffect();

      console.log(`✓ Portal Dimension marker added at ${this.config.location.name}`);
    },

    // Add hover effect to marker
    addHoverEffect: function () {
      if (!this.marker) return;

      this.marker.on('mouseover', e => {
        const icon = e.target.getElement();
        if (icon) {
          const container = icon.querySelector('.portal-logo-container');
          if (container) {
            container.style.transform = 'scale(1.15)';
            container.style.boxShadow = '0 6px 20px rgba(255, 87, 34, 0.8)';
          }
        }
      });

      this.marker.on('mouseout', e => {
        const icon = e.target.getElement();
        if (icon) {
          const container = icon.querySelector('.portal-logo-container');
          if (container) {
            container.style.transform = 'scale(1)';
            container.style.boxShadow = '0 4px 12px rgba(255, 87, 34, 0.6)';
          }
        }
      });
    },

    // Handle logo click
    handleLogoClick: async function () {
      console.log('Portal Dimension logo clicked');

      // Track click
      if (this.config.trackClicks) {
        await this.trackClick();
      }

      // Open website
      window.open(this.config.website, '_blank', 'noopener,noreferrer');

      // Show confirmation
      this.showClickConfirmation();
    },

    // Track click in local storage and Firebase
    trackClick: async function () {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // Update local stats
      this.clickStats.totalClicks++;
      this.clickStats.lastClick = now.toISOString();

      if (!this.clickStats.clicksByDay[today]) {
        this.clickStats.clicksByDay[today] = 0;
      }
      this.clickStats.clicksByDay[today]++;

      // Update click count in popup if open
      const countElement = document.getElementById('portal-clicks-count');
      if (countElement) {
        countElement.textContent = this.clickStats.totalClicks;
      }

      // Save to localStorage
      try {
        localStorage.setItem('portalDimensionStats', JSON.stringify(this.clickStats));
      } catch (e) {
        console.warn('Failed to save stats to localStorage:', e);
      }

      // Save to Firebase via callable Cloud Function if available, otherwise fallback to collection write
      if (
        window.firebaseInstances &&
        window.firebaseInstances.db &&
        window.firebaseInstances.functions &&
        window.firebaseInstances.httpsCallable
      ) {
        try {
          const { functions, httpsCallable } = window.firebaseInstances;
          const logClick = httpsCallable(functions, 'logPortalClick');
          // Ensure user is authenticated (sign in anonymously if necessary)
          if (
            window.firebaseInstances?.auth &&
            window.firebaseInstances?.signInAnonymously &&
            !window.firebaseInstances.auth.currentUser
          ) {
            try {
              await window.firebaseInstances.signInAnonymously(window.firebaseInstances.auth);
            } catch (_) {}
          }
          const res = await logClick({ location: this.config.location.name });
          if (res && res.data && res.data.success) {
            console.log('✓ Click logged via Cloud Function');
          } else {
            console.warn('Cloud Function did not return success', res);
          }
        } catch (error) {
          console.warn('Cloud Function logging failed:', error);
          // If running locally (dev) and direct writes are permitted, attempt fallback
          if (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
          ) {
            try {
              const { db, collection, addDoc, serverTimestamp } = window.firebaseInstances;
              await addDoc(collection(db, 'portalDimensionClicks'), {
                timestamp: serverTimestamp(),
                location: this.config.location.name,
                userAgent: navigator.userAgent,
                referrer: document.referrer || 'direct',
                clickDate: today,
                uid: window.firebaseInstances.auth?.currentUser?.uid || null,
              });
              console.log('✓ Click tracked to Firebase (fallback local)');
            } catch (error2) {
              console.warn('Failed to track click to Firebase in fallback:', error2);
            }
          }
        }
      } else if (window.firebaseInstances && window.firebaseInstances.db) {
        // If functions aren't available, try the collection directly
        try {
          const { db, collection, addDoc, serverTimestamp } = window.firebaseInstances;
          await addDoc(collection(db, 'portalDimensionClicks'), {
            timestamp: serverTimestamp(),
            location: this.config.location.name,
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct',
            clickDate: today,
            uid: window.firebaseInstances.auth?.currentUser?.uid || null,
          });
          console.log('✓ Click tracked to Firebase');
        } catch (error) {
          console.warn('Failed to track click to Firebase:', error);
        }
      }
    },

    // Load stats from localStorage and Firebase
    loadStats: async function () {
      // Load from localStorage
      try {
        const saved = localStorage.getItem('portalDimensionStats');
        if (saved) {
          const stats = JSON.parse(saved);
          this.clickStats = { ...this.clickStats, ...stats };
          console.log(`Loaded ${stats.totalClicks} Portal Dimension clicks from local storage`);
        }
      } catch (e) {
        console.warn('Failed to load stats from localStorage:', e);
      }

      // Optionally sync with Firebase
      if (window.firebaseInstances && window.firebaseInstances.db) {
        try {
          const { db, collection, query, getDocs } = window.firebaseInstances;

          const clicksSnapshot = await getDocs(collection(db, 'portalDimensionClicks'));
          const firebaseClicks = clicksSnapshot.size;

          if (firebaseClicks > this.clickStats.totalClicks) {
            this.clickStats.totalClicks = firebaseClicks;
          }

          console.log(`✓ Synced with Firebase: ${firebaseClicks} total clicks`);
        } catch (error) {
          console.debug('Could not sync with Firebase:', error.message);
        }
      }
    },

    // Show click confirmation
    showClickConfirmation: function () {
      const notification = document.createElement('div');
      notification.className = 'portal-click-notification';
      notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    <strong>✓ Opening Portal Dimension</strong><br/>
                    <small>Thanks for checking us out!</small>
                </div>
            `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    },

    // Get current stats
    getStats: function () {
      return {
        ...this.clickStats,
        averageClicksPerDay: this.calculateAverageClicksPerDay(),
      };
    },

    // Calculate average clicks per day
    calculateAverageClicksPerDay: function () {
      const days = Object.keys(this.clickStats.clicksByDay).length;
      if (days === 0) return 0;
      return (this.clickStats.totalClicks / days).toFixed(1);
    },
  };

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        .portal-dimension-marker {
            z-index: 1000 !important;
        }
        
        .portal-logo-container:hover {
            transform: scale(1.15) !important;
            box-shadow: 0 6px 20px rgba(255, 87, 34, 0.8) !important;
        }
    `;
  document.head.appendChild(style);

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => PortalDimensionSpot.init(), 2000); // Wait 2s for map
    });
  } else {
    setTimeout(() => PortalDimensionSpot.init(), 2000);
  }

  // Expose globally for debugging and stats access
  window.PortalDimensionSpot = PortalDimensionSpot;

  console.log('✓ Portal Dimension integration loaded');
})();
