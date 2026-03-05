// SkateQuest Charity QR Code System
// Help kids get skateboards through community scavenger hunts! 🛹❤️

import { generateSkateboardQR, downloadSkateboardQR, printSkateboardQR } from './qr-generator.js';

const supabase = window.supabaseClient;

// ===== QR CODE PURCHASE =====

export async function renderCharityShop() {
  const content = document.getElementById('content');
  if (!content) return;

  // Get current stats
  const stats = await getCharityStats();

  content.innerHTML = `
        <div style="padding:1.5rem;">
            <h2 style="background:linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                🛹❤️ Skateboards for Kids
            </h2>
            <p style="font-size:1.1rem;margin-bottom:2rem;">Buy QR codes, hide them around town, help kids get skateboards!</p>

            <!-- Impact Stats -->
            <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:1.5rem;border-radius:12px;color:white;margin-bottom:2rem;">
                <h3 style="margin-top:0;">💖 Community Impact</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;margin-top:1rem;">
                    <div style="text-align:center;background:rgba(255,255,255,0.1);padding:1rem;border-radius:8px;">
                        <div style="font-size:2rem;font-weight:bold;">$${(stats.total_raised || 0).toFixed(2)}</div>
                        <div style="font-size:0.9rem;">Raised</div>
                    </div>
                    <div style="text-align:center;background:rgba(255,255,255,0.1);padding:1rem;border-radius:8px;">
                        <div style="font-size:2rem;font-weight:bold;">${stats.total_skateboards_donated || 0}</div>
                        <div style="font-size:0.9rem;">Boards Donated</div>
                    </div>
                    <div style="text-align:center;background:rgba(255,255,255,0.1);padding:1rem;border-radius:8px;">
                        <div style="font-size:2rem;font-weight:bold;">${stats.total_kids_helped || 0}</div>
                        <div style="font-size:0.9rem;">Kids Helped</div>
                    </div>
                    <div style="text-align:center;background:rgba(255,255,255,0.1);padding:1rem;border-radius:8px;">
                        <div style="font-size:2rem;font-weight:bold;">${stats.total_qr_codes_found || 0}/${stats.total_qr_codes_sold || 0}</div>
                        <div style="font-size:0.9rem;">Codes Found</div>
                    </div>
                </div>
            </div>

            <!-- How It Works -->
            <div style="background:#f5f5f5;padding:1.5rem;border-radius:12px;margin-bottom:2rem;">
                <h3>🎯 How It Works</h3>
                <ol style="line-height:2rem;">
                    <li><strong>Buy a QR Code</strong> - $2+ goes to skateboards for kids</li>
                    <li><strong>Hide It</strong> - Place it somewhere cool around town</li>
                    <li><strong>Others Find It</strong> - Scanners get XP and rewards!</li>
                    <li><strong>Kids Get Boards</strong> - 100% goes to helping kids skate</li>
                </ol>
            </div>

            <!-- Purchase Options -->
            <div style="background:white;padding:2rem;border-radius:12px;border:3px solid #FF6B6B;">
                <h3>🎁 Purchase QR Codes</h3>
                <p>Every dollar helps a kid get a skateboard!</p>

                <div id="purchase-options" style="display:grid;gap:1rem;margin-top:1.5rem;">
                    <!-- Single Code -->
                    <div class="purchase-option" style="border:2px solid #4ECDC4;padding:1.5rem;border-radius:10px;cursor:pointer;transition:all 0.3s;" data-amount="2" data-qty="1">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h4 style="margin:0;color:#4ECDC4;">1 QR Code</h4>
                                <p style="margin:0.5rem 0 0 0;color:#666;">Hide one code, help one kid</p>
                            </div>
                            <div style="font-size:2rem;font-weight:bold;color:#4ECDC4;">$2</div>
                        </div>
                    </div>

                    <!-- Pack of 5 -->
                    <div class="purchase-option" style="border:2px solid #FF6B6B;padding:1.5rem;border-radius:10px;cursor:pointer;transition:all 0.3s;" data-amount="10" data-qty="5">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h4 style="margin:0;color:#FF6B6B;">5 QR Codes</h4>
                                <p style="margin:0.5rem 0 0 0;color:#666;">Start a mini scavenger hunt!</p>
                            </div>
                            <div style="font-size:2rem;font-weight:bold;color:#FF6B6B;">$10</div>
                        </div>
                    </div>

                    <!-- Pack of 10 -->
                    <div class="purchase-option popular" style="border:3px solid #667eea;padding:1.5rem;border-radius:10px;cursor:pointer;position:relative;background:linear-gradient(135deg, #667eea10 0%, #764ba210 100%);" data-amount="20" data-qty="10">
                        <span style="position:absolute;top:-10px;right:10px;background:#667eea;color:white;padding:0.3rem 0.8rem;border-radius:20px;font-size:0.8rem;font-weight:bold;">POPULAR</span>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h4 style="margin:0;color:#667eea;">10 QR Codes</h4>
                                <p style="margin:0.5rem 0 0 0;color:#666;">Fund half a skateboard!</p>
                            </div>
                            <div style="font-size:2rem;font-weight:bold;color:#667eea;">$20</div>
                        </div>
                    </div>

                    <!-- Custom Amount -->
                    <div style="border:2px dashed #999;padding:1.5rem;border-radius:10px;">
                        <h4 style="margin:0 0 1rem 0;">💰 Custom Amount</h4>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <span style="font-size:1.5rem;">$</span>
                            <input type="number" id="custom-amount" min="2" step="2" placeholder="20" style="flex:1;padding:0.8rem;font-size:1.2rem;border:2px solid #ddd;border-radius:8px;" />
                            <button id="custom-purchase-btn" style="padding:0.8rem 1.5rem;background:#667eea;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;white-space:nowrap;">
                                Donate
                            </button>
                        </div>
                        <p style="margin:0.5rem 0 0 0;font-size:0.9rem;color:#666;">~$50 = 1 complete skateboard for a kid</p>
                    </div>
                </div>

                <div style="margin-top:2rem;padding:1rem;background:#FFF3CD;border-radius:8px;border-left:4px solid #FFC107;">
                    <strong>⚡ Quick Demo Mode:</strong> Click any option to generate FREE test codes! Payment integration coming soon.
                </div>
            </div>

            <!-- My QR Codes Section -->
            <div style="margin-top:2rem;">
                <button id="view-my-codes-btn" style="width:100%;padding:1rem;background:#4ECDC4;color:white;border:none;border-radius:8px;font-size:1.1rem;font-weight:bold;cursor:pointer;">
                    📋 View My QR Codes
                </button>
            </div>

            <!-- Scan QR Code Section -->
            <div style="margin-top:1rem;">
                <button id="scan-qr-btn" style="width:100%;padding:1rem;background:#FF6B6B;color:white;border:none;border-radius:8px;font-size:1.1rem;font-weight:bold;cursor:pointer;">
                    📷 Scan QR Code
                </button>
            </div>
        </div>
    `;

  // Add click handlers for purchase options
  document.querySelectorAll('.purchase-option').forEach(option => {
    option.addEventListener('click', async () => {
      const amount = parseFloat(option.dataset.amount);
      const qty = parseInt(option.dataset.qty);
      await purchaseQRCodes(amount, qty);
    });

    // Hover effect
    option.addEventListener('mouseenter', () => {
      option.style.transform = 'scale(1.02)';
      option.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });
    option.addEventListener('mouseleave', () => {
      option.style.transform = 'scale(1)';
      option.style.boxShadow = 'none';
    });
  });

  // Custom amount purchase
  document.getElementById('custom-purchase-btn').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('custom-amount').value);
    if (!amount || amount < 2) {
      alert('Minimum donation is $2');
      return;
    }
    const qty = Math.floor(amount / 2); // 1 code per $2
    await purchaseQRCodes(amount, qty);
  });

  // View my codes button
  document.getElementById('view-my-codes-btn').addEventListener('click', () => {
    renderMyQRCodes();
  });

  // Scan QR button
  document.getElementById('scan-qr-btn').addEventListener('click', () => {
    renderQRScanner();
  });
}

// ===== PURCHASE QR CODES =====

async function purchaseQRCodes(amount, quantity) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to purchase QR codes');
      return;
    }

    // Get user profile for username
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username || 'Anonymous';

    // Show customization modal
    showCustomizeCodeModal(user.id, username, amount, quantity);
  } catch (error) {
    console.error('Purchase error:', error);
    alert('Error purchasing codes. Please try again.');
  }
}

// Show modal to customize QR code with trick challenge
function showCustomizeCodeModal(userId, username, amount, quantity) {
  const modal = document.createElement('div');
  modal.style.cssText =
    'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;padding:1rem;';

  modal.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:12px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;">
            <h2 style="margin-top:0;">🎨 Customize Your QR Code${quantity > 1 ? 's' : ''}</h2>
            <p>Add a trick challenge for the finder!</p>

            <div style="margin:1.5rem 0;">
                <label style="display:block;margin-bottom:0.5rem;font-weight:bold;">🛹 Trick Challenge (Optional)</label>
                <input type="text" id="trick-challenge" placeholder="e.g., Kickflip, 50-50 Grind, Tre Flip..." style="width:100%;padding:0.8rem;border:2px solid #ddd;border-radius:8px;font-size:1rem;" />
                <p style="margin:0.5rem 0 0 0;font-size:0.9rem;color:#666;">Leave blank for no challenge, or add a trick for extra fun!</p>
            </div>

            <div style="margin:1.5rem 0;">
                <label style="display:block;margin-bottom:0.5rem;font-weight:bold;">💬 Custom Message (Optional)</label>
                <textarea id="custom-message" placeholder="Add a message for the finder..." rows="3" style="width:100%;padding:0.8rem;border:2px solid #ddd;border-radius:8px;font-size:1rem;resize:vertical;"></textarea>
                <p style="margin:0.5rem 0 0 0;font-size:0.9rem;color:#666;">E.g., "Land this trick at this spot for bonus XP!"</p>
            </div>

            <div style="margin:1.5rem 0;">
                <label style="display:block;margin-bottom:0.5rem;font-weight:bold;">⭐ XP Reward</label>
                <input type="number" id="xp-reward" value="100" min="50" max="500" step="50" style="width:100%;padding:0.8rem;border:2px solid #ddd;border-radius:8px;font-size:1rem;" />
                <p style="margin:0.5rem 0 0 0;font-size:0.9rem;color:#666;">More XP = Bigger challenge!</p>
            </div>

            <div style="margin:1.5rem 0;padding:1rem;background:#E8F5E9;border-radius:8px;border-left:4px solid #4CAF50;">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                    <input type="checkbox" id="proof-required" />
                    <span><strong>Require Video Proof</strong> (Finder must upload video of landing the trick)</span>
                </label>
            </div>

            <div style="background:#FFF3CD;padding:1rem;border-radius:8px;margin-bottom:1.5rem;">
                <strong>💰 Summary:</strong><br/>
                ${quantity} QR Code${quantity > 1 ? 's' : ''} = $${amount.toFixed(2)}<br/>
                <span style="font-size:0.9rem;color:#666;">(Demo Mode: Free test codes)</span>
            </div>

            <div style="display:flex;gap:1rem;">
                <button id="cancel-btn" style="flex:1;padding:1rem;background:#ddd;color:#333;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
                    Cancel
                </button>
                <button id="confirm-purchase-btn" style="flex:2;padding:1rem;background:#4ECDC4;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
                    🎁 Create QR Code${quantity > 1 ? 's' : ''}
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  // Cancel button
  modal.querySelector('#cancel-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Confirm purchase
  modal.querySelector('#confirm-purchase-btn').addEventListener('click', async () => {
    const trickChallenge = modal.querySelector('#trick-challenge').value.trim();
    const customMessage = modal.querySelector('#custom-message').value.trim();
    const xpReward = parseInt(modal.querySelector('#xp-reward').value);
    const proofRequired = modal.querySelector('#proof-required').checked;

    try {
      // Create codes with customization
      await createCustomQRCodes(
        userId,
        username,
        amount,
        quantity,
        trickChallenge,
        customMessage,
        xpReward,
        proofRequired
      );

      document.body.removeChild(modal);

      alert(
        `✅ Success! You created ${quantity} QR code${quantity > 1 ? 's' : ''}!\n\n` +
          (trickChallenge ? `Trick Challenge: ${trickChallenge}\n` : '') +
          `XP Reward: ${xpReward}\n\n` +
          `Check "View My QR Codes" to download and hide them!`
      );

      renderCharityShop();
    } catch (error) {
      console.error('Error creating codes:', error);
      alert('Error creating codes. Please try again.');
    }
  });
}

// Create QR codes with customization
async function createCustomQRCodes(
  userId,
  username,
  amount,
  quantity,
  trickChallenge,
  customMessage,
  xpReward,
  proofRequired
) {
  // First create donation record
  const { error: donationError } = await supabase.from('donations').insert({
    donor_id: userId,
    donor_name: username,
    amount: amount,
    type: 'qr_purchase',
    payment_method: 'demo',
    payment_id: 'demo_' + Date.now(),
    status: 'completed',
  });

  if (donationError) throw donationError;

  // Create each QR code
  const codes = [];
  for (let i = 0; i < quantity; i++) {
    // Generate unique code
    const code = 'SK8-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        code: code,
        purchased_by: userId,
        purchaser_name: username,
        purchase_price: amount / quantity,
        status: 'active',
        trick_challenge: trickChallenge || null,
        challenge_message: customMessage || null,
        xp_reward: xpReward,
        proof_required: proofRequired,
      })
      .select()
      .single();

    if (error) throw error;
    codes.push(data);
  }

  return codes;
}

// ===== VIEW MY QR CODES =====

export async function renderMyQRCodes() {
  const content = document.getElementById('content');
  if (!content) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's QR codes
    const { data: codes, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('purchased_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    content.innerHTML = `
            <div style="padding:1.5rem;">
                <button onclick="history.back()" style="margin-bottom:1rem;padding:0.5rem 1rem;background:#ddd;border:none;border-radius:6px;cursor:pointer;">
                    ← Back to Shop
                </button>

                <h2>📋 My QR Codes</h2>
                <p>You have <strong>${codes.length}</strong> QR code${codes.length !== 1 ? 's' : ''}</p>

                <div id="codes-list" style="margin-top:2rem;display:flex;flex-direction:column;gap:1rem;">
                    ${codes.length === 0 ? '<p style="color:#666;">No codes yet. Purchase some to get started!</p>' : ''}
                </div>
            </div>
        `;

    const codesList = document.getElementById('codes-list');

    codes.forEach(code => {
      const codeCard = document.createElement('div');
      codeCard.style.cssText =
        'background:white;padding:1.5rem;border-radius:10px;border:2px solid #4ECDC4;';

      const statusColors = {
        active: '#4ECDC4',
        hidden: '#667eea',
        found: '#4CAF50',
        expired: '#999',
      };

      const statusEmojis = {
        active: '🆕',
        hidden: '🗺️',
        found: '✅',
        expired: '⏰',
      };

      codeCard.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">
                    <div>
                        <h3 style="margin:0;font-family:monospace;font-size:1.3rem;">${code.code}</h3>
                        <span style="background:${statusColors[code.status]};color:white;padding:0.3rem 0.6rem;border-radius:4px;font-size:0.8rem;margin-top:0.5rem;display:inline-block;">
                            ${statusEmojis[code.status]} ${code.status.toUpperCase()}
                        </span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.2rem;font-weight:bold;color:#4ECDC4;">$${code.purchase_price.toFixed(2)}</div>
                        <div style="font-size:0.8rem;color:#666;">donated</div>
                    </div>
                </div>

                ${
                  code.status === 'found'
                    ? `
                    <div style="background:#E8F5E9;padding:1rem;border-radius:6px;margin-bottom:1rem;">
                        <strong>Found by:</strong> ${code.found_by_name || 'Anonymous'}<br/>
                        <strong>Found:</strong> ${new Date(code.found_at).toLocaleString()}
                    </div>
                `
                    : ''
                }

                ${
                  code.status === 'hidden'
                    ? `
                    <div style="background:#E3F2FD;padding:1rem;border-radius:6px;margin-bottom:1rem;">
                        <strong>Hidden at:</strong> ${code.hidden_location_description || 'Secret location'}<br/>
                        <strong>Hidden:</strong> ${new Date(code.hidden_at).toLocaleString()}
                    </div>
                `
                    : ''
                }

                <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">
                    ${
                      code.status === 'active'
                        ? `
                        <button class="download-qr-btn" data-code="${code.code}" style="flex:1;padding:0.6rem;background:#4ECDC4;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;min-width:120px;">
                            📥 Download
                        </button>
                        <button class="print-qr-btn" data-code="${code.code}" style="flex:1;padding:0.6rem;background:#FF6B6B;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;min-width:120px;">
                            🖨️ Print
                        </button>
                        <button class="mark-hidden-btn" data-code-id="${code.id}" style="flex:1;padding:0.6rem;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;min-width:120px;">
                            🗺️ Mark Hidden
                        </button>
                    `
                        : ''
                    }
                </div>
            `;

      codesList.appendChild(codeCard);
    });

    // Add event listeners
    document.querySelectorAll('.download-qr-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        downloadQRCode(code);
      });
    });

    document.querySelectorAll('.print-qr-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        printQRCodeFunc(code);
      });
    });

    document.querySelectorAll('.mark-hidden-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const codeId = btn.dataset.codeId;
        await markAsHidden(codeId);
      });
    });
  } catch (error) {
    console.error('Error loading codes:', error);
    content.innerHTML = '<p>Error loading your codes.</p>';
  }
}

// ===== QR CODE SCANNER =====

export function renderQRScanner() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
        <div style="padding:1.5rem;">
            <button onclick="history.back()" style="margin-bottom:1rem;padding:0.5rem 1rem;background:#ddd;border:none;border-radius:6px;cursor:pointer;">
                ← Back
            </button>

            <h2>📷 Scan QR Code</h2>
            <p>Found a SkateQuest charity code? Scan it here!</p>

            <div style="background:white;padding:2rem;border-radius:12px;border:2px dashed #FF6B6B;margin-top:2rem;text-align:center;">
                <div style="font-size:3rem;margin-bottom:1rem;">📱</div>
                <p>Enter the code you found:</p>
                <input type="text" id="manual-code-input" placeholder="SK8-XXXXXXXX" style="width:100%;max-width:300px;padding:1rem;font-size:1.2rem;border:2px solid #ddd;border-radius:8px;text-align:center;font-family:monospace;text-transform:uppercase;margin:1rem 0;" />
                <br/>
                <button id="redeem-code-btn" style="padding:1rem 2rem;background:#FF6B6B;color:white;border:none;border-radius:8px;font-size:1.1rem;font-weight:bold;cursor:pointer;margin-top:1rem;">
                    ✨ Redeem Code
                </button>
            </div>

            <div style="margin-top:2rem;padding:1rem;background:#E3F2FD;border-radius:8px;">
                <strong>💡 Tip:</strong> Look for QR codes hidden around skate spots, parks, and shops!
            </div>
        </div>
    `;

  document.getElementById('redeem-code-btn').addEventListener('click', async () => {
    const code = document.getElementById('manual-code-input').value.trim().toUpperCase();
    if (!code) {
      alert('Please enter a code');
      return;
    }
    await redeemQRCode(code);
  });
}

// ===== HELPER FUNCTIONS =====

async function getCharityStats() {
  const { data, error } = await supabase.from('charity_stats').select('*').eq('id', 1).single();

  if (error) {
    console.error('Error loading stats:', error);
    return {};
  }

  return data || {};
}

async function downloadQRCode(codeData) {
  try {
    // Get full QR code details from database
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', codeData.code || codeData)
      .single();

    if (error) throw error;

    const qrCode = data;

    // Generate skateboard-shaped QR code
    const canvas = generateSkateboardQR(
      qrCode.code,
      qrCode.trick_challenge,
      qrCode.challenge_message,
      qrCode.xp_reward || 100
    );

    // Download the skateboard QR image
    downloadSkateboardQR(canvas, qrCode.code);

    alert(
      `📥 Downloaded!\n\nYour skateboard QR code is ready!\n\n` +
        `Code: ${qrCode.code}\n` +
        (qrCode.trick_challenge ? `Trick: ${qrCode.trick_challenge}\n` : '') +
        `XP Reward: ${qrCode.xp_reward || 100}\n\n` +
        `Print it and hide it somewhere cool!`
    );
  } catch (error) {
    console.error('Error downloading QR code:', error);
    alert('Error generating QR code. Please try again.');
  }
}

async function printQRCodeFunc(codeData) {
  try {
    // Get full QR code details from database
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', codeData.code || codeData)
      .single();

    if (error) throw error;

    const qrCode = data;

    // Generate skateboard-shaped QR code
    const canvas = generateSkateboardQR(
      qrCode.code,
      qrCode.trick_challenge,
      qrCode.challenge_message,
      qrCode.xp_reward || 100
    );

    // Print the skateboard QR
    printSkateboardQR(canvas);
  } catch (error) {
    console.error('Error printing QR code:', error);
    alert('Error generating QR code for print. Please try again.');
  }
}

async function markAsHidden(codeId) {
  const location = prompt('Where did you hide it? (e.g., "Under bench at Venice Skatepark")');
  if (!location) return;

  try {
    const { error } = await supabase
      .from('qr_codes')
      .update({
        status: 'hidden',
        hidden_at: new Date().toISOString(),
        hidden_location_description: location,
      })
      .eq('id', codeId);

    if (error) throw error;

    alert('✅ Marked as hidden! Good luck to the finders!');
    renderMyQRCodes();
  } catch (error) {
    console.error('Error marking as hidden:', error);
    alert('Error updating code. Please try again.');
  }
}

async function redeemQRCode(code) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to redeem codes');
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Find the QR code
    const { data: qrCode, error: fetchError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError || !qrCode) {
      alert('❌ Code not found. Check the code and try again.');
      return;
    }

    if (qrCode.status === 'found') {
      alert('⚠️ This code has already been found!');
      return;
    }

    if (qrCode.purchased_by === user.id) {
      alert("😅 You can't redeem your own code!");
      return;
    }

    // Mark as found
    const { error: updateError } = await supabase
      .from('qr_codes')
      .update({
        status: 'found',
        found_by: user.id,
        found_by_name: profile?.username || 'Anonymous',
        found_at: new Date().toISOString(),
      })
      .eq('id', qrCode.id);

    if (updateError) throw updateError;

    // Award XP to finder
    await supabase.rpc('increment_xp', {
      user_id: user.id,
      amount: qrCode.xp_reward || 100,
    });

    alert(
      `🎉 CODE FOUND!\n\n` +
        `You earned ${qrCode.xp_reward || 100} XP!\n\n` +
        `Thanks for participating in our charity scavenger hunt!\n\n` +
        `Hidden by: ${qrCode.purchaser_name}\n` +
        `Donated: $${qrCode.purchase_price.toFixed(2)} to help kids skate!`
    );

    renderCharityShop();
  } catch (error) {
    console.error('Error redeeming code:', error);
    alert('Error redeeming code. Please try again.');
  }
}

// Export functions
export default {
  renderCharityShop,
  renderMyQRCodes,
  renderQRScanner,
};
