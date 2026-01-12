// SkateQuest Professional Onboarding Flow
// Ensures users accept terms before using the app

export function showOnboarding() {
  // Check if user has already completed onboarding
  const hasCompletedOnboarding = localStorage.getItem('skatequest_onboarding_completed');
  const termsVersion = '2024-11-30'; // Update this when terms change
  const acceptedVersion = localStorage.getItem('skatequest_terms_version');

  if (hasCompletedOnboarding && acceptedVersion === termsVersion) {
    return; // User has already onboarded with current terms
  }

  // Create onboarding modal
  const modal = document.createElement('div');
  modal.id = 'onboarding-modal';
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: fadeIn 0.3s ease-in;
    `;

  modal.innerHTML = `
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .onboarding-content {
                animation: slideUp 0.5s ease-out;
            }
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin: 1.5rem 0;
            }
            .feature-card {
                background: rgba(255, 255, 255, 0.1);
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid #4ECDC4;
                transition: all 0.3s;
            }
            .feature-card:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
            }
            .warning-box {
                background: #ffebee;
                border-left: 4px solid #c62828;
                padding: 1rem;
                border-radius: 4px;
                color: #000;
                margin: 1rem 0;
            }
            .checkbox-container {
                display: flex;
                align-items: flex-start;
                gap: 0.8rem;
                margin: 1.5rem 0;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .checkbox-container:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .checkbox-container input[type="checkbox"] {
                width: 24px;
                height: 24px;
                cursor: pointer;
                flex-shrink: 0;
                margin-top: 2px;
            }
            .checkbox-label {
                flex: 1;
                font-size: 0.95rem;
                line-height: 1.6;
                cursor: pointer;
            }
            .get-started-btn {
                width: 100%;
                padding: 1.2rem;
                font-size: 1.1rem;
                font-weight: bold;
                background: #4ECDC4;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                opacity: 0.5;
                cursor: not-allowed;
            }
            .get-started-btn:enabled {
                opacity: 1;
                cursor: pointer;
            }
            .get-started-btn:enabled:hover {
                background: #3EBCB4;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
            }
            .terms-link {
                color: #4ECDC4;
                text-decoration: none;
                font-weight: bold;
            }
            .terms-link:hover {
                text-decoration: underline;
            }
        </style>

        <div class="onboarding-content" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            max-width: 700px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 16px;
            padding: 2.5rem;
            color: white;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <!-- Logo/Header -->
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="font-size: 3rem; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🛹 SkateQuest
                </h1>
                <p style="font-size: 1.2rem; margin: 0.5rem 0 0 0; opacity: 0.9;">
                    Where every session counts, and every kid gets a board
                </p>
            </div>

            <!-- Welcome Message -->
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2 style="font-size: 1.8rem; margin: 0 0 0.5rem 0;">Welcome to the Future of Skateboarding! 🚀</h2>
                <p style="font-size: 1.1rem; line-height: 1.6; opacity: 0.95;">
                    Join the global skateboarding community. Discover spots, track progress, connect with crews, and help kids get skateboards.
                </p>
            </div>

            <!-- Features Grid -->
            <div class="feature-grid">
                <div class="feature-card">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🗺️</div>
                    <div style="font-weight: bold; margin-bottom: 0.3rem;">Discover Spots</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Find the best skate spots worldwide</div>
                </div>
                <div class="feature-card">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
                    <div style="font-weight: bold; margin-bottom: 0.3rem;">Join Crews</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Compete on team leaderboards</div>
                </div>
                <div class="feature-card">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏱️</div>
                    <div style="font-weight: bold; margin-bottom: 0.3rem;">Track Sessions</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Earn XP, level up, unlock badges</div>
                </div>
                <div class="feature-card">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">❤️</div>
                    <div style="font-weight: bold; margin-bottom: 0.3rem;">Help Kids Skate</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">Charity QR scavenger hunts</div>
                </div>
            </div>

            <!-- Critical Safety Warning -->
            <div class="warning-box">
                <h3 style="margin: 0 0 0.5rem 0; color: #c62828; font-size: 1.1rem;">
                    ⚠️ CRITICAL SAFETY NOTICE
                </h3>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">
                    <strong>Skateboarding is EXTREMELY DANGEROUS and can result in SERIOUS INJURY OR DEATH.</strong>
                    By using SkateQuest, you acknowledge that you use this app and participate in skateboarding AT YOUR OWN RISK.
                    SkateQuest is NOT LIABLE for ANY injuries, damages, or legal consequences.
                </p>
            </div>

            <!-- Terms Acceptance -->
            <label class="checkbox-container" id="terms-checkbox-container">
                <input type="checkbox" id="terms-checkbox" />
                <div class="checkbox-label">
                    <strong style="font-size: 1.05rem;">I have read and agree to the
                    <a href="#" class="terms-link" id="view-terms-link">Terms of Service</a>
                    and <a href="#" class="terms-link" id="view-privacy-link">Privacy Policy</a></strong>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.9;">
                        By checking this box, I confirm that:<br/>
                        • I am 18+ or have parental consent<br/>
                        • I assume all risks of skateboarding<br/>
                        • I waive all liability claims against SkateQuest<br/>
                        • I will obey all laws and not trespass<br/>
                        • I understand this is legally binding
                    </div>
                </div>
            </label>

            <!-- Age Verification -->
            <label class="checkbox-container" id="age-checkbox-container">
                <input type="checkbox" id="age-checkbox" />
                <div class="checkbox-label">
                    <strong>I am 18 years or older, OR I have my parent/guardian's permission to use this app</strong>
                </div>
            </label>

            <!-- Get Started Button -->
            <button id="get-started-btn" class="get-started-btn" disabled>
                🛹 Accept & Get Started
            </button>

            <!-- Footer Links -->
            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.7;">
                By continuing, you help us build the world's largest skateboarding community
                and contribute to getting 10,000 kids on skateboards by 2030.
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  // Get elements
  const termsCheckbox = document.getElementById('terms-checkbox');
  const ageCheckbox = document.getElementById('age-checkbox');
  const getStartedBtn = document.getElementById('get-started-btn');
  const viewTermsLink = document.getElementById('view-terms-link');
  const viewPrivacyLink = document.getElementById('view-privacy-link');

  // Enable/disable button based on checkboxes
  function updateButtonState() {
    const bothChecked = termsCheckbox.checked && ageCheckbox.checked;
    getStartedBtn.disabled = !bothChecked;
  }

  termsCheckbox.addEventListener('change', updateButtonState);
  ageCheckbox.addEventListener('change', updateButtonState);

  // View terms link
  viewTermsLink.addEventListener('click', e => {
    e.preventDefault();
    const legalBtn = document.getElementById('legalBtn');
    if (legalBtn) {
      // Temporarily hide onboarding modal
      modal.style.display = 'none';
      legalBtn.click();

      // Add button to return to onboarding
      setTimeout(() => {
        const returnBtn = document.createElement('button');
        returnBtn.textContent = '← Back to Onboarding';
        returnBtn.style.cssText =
          'position:fixed;top:20px;right:20px;z-index:10001;padding:1rem 1.5rem;background:#4ECDC4;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        returnBtn.onclick = () => {
          modal.style.display = 'flex';
          returnBtn.remove();
          document.getElementById('legalModal')?.style.display = 'none';
        };
        document.body.appendChild(returnBtn);
      }, 100);
    }
  });

  // Privacy policy link (same as terms for now)
  viewPrivacyLink.addEventListener('click', e => {
    e.preventDefault();
    viewTermsLink.click();
  });

  // Checkbox container clicks
  document.getElementById('terms-checkbox-container').addEventListener('click', e => {
    if (e.target.tagName !== 'A' && e.target.tagName !== 'INPUT') {
      termsCheckbox.checked = !termsCheckbox.checked;
      updateButtonState();
    }
  });

  document.getElementById('age-checkbox-container').addEventListener('click', e => {
    if (e.target.tagName !== 'INPUT') {
      ageCheckbox.checked = !ageCheckbox.checked;
      updateButtonState();
    }
  });

  // Get Started button
  getStartedBtn.addEventListener('click', () => {
    if (!termsCheckbox.checked || !ageCheckbox.checked) {
      alert('Please accept the terms and confirm your age to continue.');
      return;
    }

    // Record acceptance
    const timestamp = new Date().toISOString();
    localStorage.setItem('skatequest_onboarding_completed', 'true');
    localStorage.setItem('skatequest_terms_version', termsVersion);
    localStorage.setItem('skatequest_terms_accepted_at', timestamp);

    // Analytics event (if analytics is set up)
    if (window.gtag) {
      window.gtag('event', 'onboarding_completed', {
        timestamp: timestamp,
        terms_version: termsVersion,
      });
    }

    // Show success animation
    getStartedBtn.innerHTML = '✅ Welcome to SkateQuest!';
    getStartedBtn.style.background = '#4CAF50';

    // Remove modal with fade out
    setTimeout(() => {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.remove();

        // Trigger discover view
        const discoverBtn = document.getElementById('discoverBtn');
        if (discoverBtn) {
          discoverBtn.click();
        }
      }, 300);
    }, 800);
  });

  // Prevent closing modal by clicking outside
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      // Don't allow closing - user must accept terms
      modal.style.animation = 'shake 0.5s';
      setTimeout(() => {
        modal.style.animation = '';
      }, 500);
    }
  });

  // Add shake animation
  const style = document.createElement('style');
  style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
  document.head.appendChild(style);
}

// Export function to check if user has accepted current terms
export function hasAcceptedTerms() {
  const hasCompleted = localStorage.getItem('skatequest_onboarding_completed');
  const termsVersion = '2024-11-30';
  const acceptedVersion = localStorage.getItem('skatequest_terms_version');
  return hasCompleted && acceptedVersion === termsVersion;
}

// Export function to force show onboarding (for testing or terms updates)
export function forceShowOnboarding() {
  localStorage.removeItem('skatequest_onboarding_completed');
  localStorage.removeItem('skatequest_terms_version');
  showOnboarding();
}
