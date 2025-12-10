// main.js
// Note: firebase modules are loaded in `index.html` via CDN and exposed as
// `window.firebaseInstances`. Avoid using bare module specifiers in browser
// JS to prevent "Failed to resolve module specifier" errors.

// ...existing code will reference firebase via window.firebaseInstances
// e.g. const { db, storage, doc, getDocs } = window.firebaseInstances;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Leaflet map
    window.map = L.map('map').setView([39.8283, -98.5795], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(window.map);
    console.log('✓ Map initialized');
    
    const spotSelect = document.getElementById('spot-select');
    const trickSelect = document.getElementById('trick-select');
    const challengerInput = document.getElementById('challenger-input');
    const issueChallengeButton = document.getElementById('issue-challenge');
    // Small API helper. Use relative endpoints like '/spots' or pass a full URL.
    const apiFetch = async (endpoint, options) => {
        // Use relative path for Netlify Functions or configure your backend URL here
        // For now, using a placeholder that won't cause ERR_NAME_NOT_RESOLVED
        const base = '/.netlify/functions';
        const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        // Attach Firebase auth token when available
        const headers = (options && options.headers) ? { ...options.headers } : {};
        try {
            if (window.firebaseInstances && window.firebaseInstances.auth && window.firebaseInstances.auth.currentUser && window.firebaseInstances.auth.currentUser.getIdToken) {
                const token = await window.firebaseInstances.auth.currentUser.getIdToken(/* forceRefresh */ false);
                if (token) headers['Authorization'] = 'Bearer ' + token;
            }
        } catch (e) {
            // ignore token errors, continue without auth header
            console.debug('apiFetch: could not get id token', e && e.message);
        }
        try {
            const res = await fetch(url, { ...(options || {}), headers });
            if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
            return res.json();
        } catch (error) {
            // Handle network errors gracefully
            console.error('API fetch error:', error);
            throw error;
        }
    };

    // Helper to populate a <select> with items from an API
    const populateSelect = async (endpointOrUrl, selectEl, textKey = 'name') => {
        if (!selectEl) return;
        // show loading state
        selectEl.disabled = true;
        selectEl.innerHTML = '';
        const loadingOption = document.createElement('option');
        loadingOption.textContent = 'Loading...';
        loadingOption.disabled = true;
        loadingOption.selected = true;
        selectEl.appendChild(loadingOption);
        try {
            const data = await apiFetch(endpointOrUrl);
            // clear and optionally restore placeholder
            const placeholder = selectEl.querySelector('option[disabled][data-placeholder]');
            selectEl.innerHTML = '';
            if (placeholder) selectEl.appendChild(placeholder);
            if (!Array.isArray(data) || !data.length) {
                const empty = document.createElement('option');
                empty.textContent = 'No items found';
                empty.disabled = true;
                selectEl.appendChild(empty);
                return;
            }
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item[textKey] || item.name || item.id;
                selectEl.appendChild(option);
            });
        } catch (err) {
            console.error(`Error fetching ${endpointOrUrl}:`, err);
            // show error option
            selectEl.innerHTML = '';
            const errOpt = document.createElement('option');
            errOpt.textContent = 'Failed to load';
            errOpt.disabled = true;
            selectEl.appendChild(errOpt);
            showToast('Failed to load data from server', 'error');
        } finally {
            selectEl.disabled = false;
        }
    }

    // Tiny toast helper for transient messages
    const showToast = (message, type = 'info', ttl = 3500) => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.right = '1rem';
            container.style.bottom = '1rem';
            container.style.zIndex = 10000;
            document.body.appendChild(container);
        }
        const t = document.createElement('div');
        t.textContent = message;
        t.style.marginTop = '0.5rem';
        t.style.padding = '0.6rem 0.9rem';
        t.style.borderRadius = '6px';
        t.style.background = (type === 'error') ? '#c44' : '#333';
        t.style.color = '#fff';
        t.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
        container.appendChild(t);
        setTimeout(() => t.remove(), ttl);
    }

    // Fallback loader for spots from a static JSON when functions/Firestore are unavailable
    async function fallbackPopulateSpotsFromStatic() {
        try {
            const res = await fetch('/parks.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error(`parks.json not found (${res.status})`);
            const parks = await res.json();
            if (Array.isArray(parks) && parks.length && spotSelect) {
                // populate the spot select
                const placeholder = spotSelect.querySelector('option[disabled][data-placeholder]');
                spotSelect.innerHTML = '';
                if (placeholder) spotSelect.appendChild(placeholder);
                parks.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id || p.name;
                    opt.textContent = p.name;
                    spotSelect.appendChild(opt);
                });
                // add markers to the map if available
                if (window.map && window.L) {
                    parks.forEach(p => {
                        if (p.lat && p.lng) {
                            L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.name);
                        }
                    });
                }
                showToast(`Loaded ${parks.length} parks from static data`, 'info');
            }
        } catch (e) {
            console.warn('fallbackPopulateSpotsFromStatic failed', e);
        }
    }

    // Populate selects; for spots, try function first then fallback to static parks
    Promise.all([
        (async () => {
            try {
                await populateSelect('/spots', spotSelect, 'name');
            } catch (e) {
                await fallbackPopulateSpotsFromStatic();
            }
        })(),
        populateSelect('/tricks', trickSelect, 'name')
    ]).catch(err => console.error('Failed to populate selects:', err));

    // Render leaderboard on load
    renderLeaderboard();

    // Render badges for signed-in user
    async function renderBadgesForUser(uid) {
        try {
            if (!window.firebaseInstances) return;
            const { db, doc, getDoc } = window.firebaseInstances;
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            const data = snap.exists() ? snap.data() : {};
            renderBadges(data.badges || {});
        } catch (e) { console.error('renderBadgesForUser', e); }
    }

    function renderBadges(badges) {
        const badgeEl = document.getElementById('badge-display');
        if (!badgeEl) return;
        badgeEl.innerHTML = '<h3>Badges</h3>';
        const container = document.createElement('div');
        container.className = 'badges';
        Object.keys(badges || {}).forEach(b => {
            if (badges[b]) {
                const icon = document.createElement('div');
                icon.textContent = `🏅 ${b.replace(/-/g, ' ')}`;
                container.appendChild(icon);
            }
        });
        badgeEl.appendChild(container);
    }

    async function checkAndAwardBadges(uid, userData) {
        try {
            if (!window.firebaseInstances) return;
            const { db, doc, updateDoc } = window.firebaseInstances;
            const updates = {};
            if ((userData.xp || 0) >= 100 && !(userData.badges && userData.badges['100-xp'])) {
                updates['badges.100-xp'] = true;
                showToast('🏅 Badge unlocked: 100 XP!');
            }
            if ((userData.streak || 0) >= 5 && !(userData.badges && userData.badges['5-day-streak'])) {
                updates['badges.5-day-streak'] = true;
                showToast('🔥 Badge unlocked: 5-Day Streak!');
            }
            if (Object.keys(updates).length) {
                const userRef = doc(db, 'users', uid);
                await updateDoc(userRef, updates);
                renderBadgesForUser(uid);
            }
        } catch (e) { console.error('checkAndAwardBadges', e); }
    }

    // ...existing code can hook up challenge issuance, form handling, etc.
    // Issue challenge button handler: create a challenge in Firestore if possible, otherwise POST to API
    if (issueChallengeButton) {
        issueChallengeButton.addEventListener('click', async () => {
            const spotId = spotSelect && spotSelect.value;
            const trickId = trickSelect && trickSelect.value;
            const titleInput = document.getElementById('challenge-title');
            const descInput = document.getElementById('challenge-desc');
            const xpInput = document.getElementById('challenge-xp');
            let challenger = challengerInput && challengerInput.value && challengerInput.value.trim();
            // default challenger to signed-in Firebase user ID if not provided
            try {
                if ((!challenger || challenger.length === 0) && window.firebaseInstances && window.firebaseInstances.auth && window.firebaseInstances.auth.currentUser) {
                    challenger = window.firebaseInstances.auth.currentUser.uid;
                }
            } catch (e) { /* ignore */ }
            if (!spotId || !trickId || !challenger) {
                alert('Please select a spot, select a trick, and enter a challenger ID.');
                return;
            }
            issueChallengeButton.disabled = true;
            try {
                // Prefer Firestore if firebaseInstances are ready
                if (window.firebaseInstances && window.firebaseInstances.addDoc && window.firebaseInstances.collection) {
                    const { db, addDoc, collection, serverTimestamp } = window.firebaseInstances;
                    // Build payload with optional title/description/xp
                    const payload = {
                        spotId,
                        trick: trickId,
                        challengerId: challenger,
                        status: 'pending',
                        title: (titleInput && titleInput.value && titleInput.value.trim()) || `Challenge: ${trickId} at ${spotId}`,
                        description: (descInput && descInput.value && descInput.value.trim()) || '',
                        xp: (xpInput && parseInt(xpInput.value, 10)) || 50,
                        createdBy: challenger,
                        timestamp: Date.now(),
                        createdAt: serverTimestamp()
                    };
                    const docRef = await addDoc(collection(db, 'challenges'), payload);
                    showToast('Challenge created', 'info');
                    // show confirmation and link
                    const conf = document.getElementById('challenge-confirm');
                    if (conf) {
                        conf.innerHTML = `Created: <code>${docRef.id}</code>`;
                        // store the created challenge id so the Mark Complete button can find it
                        conf.dataset.challengeId = docRef.id;
                    }
                    // if expiresAt present, render timer
                    if (payload.expiresAt) renderChallengeTimer(payload.expiresAt);
                    // Refresh leaderboard after XP-impacting events
                    renderLeaderboard();
                } else {
                    // Fallback to POSTing to API
                    const apiPayload = {
                        spotId,
                        trick: trickId,
                        challengerId: challenger,
                        title: (titleInput && titleInput.value && titleInput.value.trim()) || `Challenge: ${trickId} at ${spotId}`,
                        description: (descInput && descInput.value && descInput.value.trim()) || '',
                        xp: (xpInput && parseInt(xpInput.value, 10)) || 50,
                        createdBy: challenger,
                        timestamp: Date.now()
                    };
                    await apiFetch('/challenges', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(apiPayload)
                    });
                    showToast('Challenge created via API', 'info');
                    // API may return an id - not handled here; clear confirmation
                    const conf = document.getElementById('challenge-confirm'); if (conf) conf.textContent = '';
                    renderLeaderboard();
                }
            } catch (err) {
                console.error('Failed to create challenge', err);
                showToast('Failed to create challenge: ' + (err && err.message ? err.message : 'unknown error'), 'error');
            } finally {
                issueChallengeButton.disabled = false;
            }
        });
    }

    // Rating submit wiring: default to selected spot if available
    const ratingBtn = document.getElementById('rating-submit');
    if (ratingBtn) {
        ratingBtn.addEventListener('click', async () => {
            const ratingSelect = document.getElementById('rating-select');
            if (!ratingSelect) {
                showToast('Rating select element not found. Please reload the page or contact support.', 'error');
                return;
            }
            const rating = parseInt(ratingSelect.value, 10);
            // prefer currently selected spot
            const selectedSpotId = (spotSelect && spotSelect.value) ? spotSelect.value : 'spotId123';
            await rateSpot(selectedSpotId, rating);
        });
    }

    // Challenge timer rendering
    let challengeTimerInterval = null;
    function renderChallengeTimer(expiresAt) {
        const el = document.getElementById('challenge-timer');
        if (!el) return;
        el.style.display = 'block';
        function update() {
            const now = Date.now();
            const remaining = expiresAt - now;
            if (remaining <= 0) { el.textContent = 'Expired'; clearInterval(challengeTimerInterval); return; }
            const hrs = Math.floor(remaining / 3600000); const mins = Math.floor((remaining % 3600000)/60000); const secs = Math.floor((remaining%60000)/1000);
            el.textContent = `Expires in ${hrs}h ${mins}m ${secs}s`;
        }
        if (challengeTimerInterval) clearInterval(challengeTimerInterval);
        update();
        challengeTimerInterval = setInterval(update, 1000);
    }

    // Heatmap rendering (requires leaflet-heat plugin available on page)
    let heatLayer = null;
    async function renderHeatmap() {
        try {
            if (!window.firebaseInstances || !window.map) return;
            const { db, collection, getDocs } = window.firebaseInstances;
            const snaps = await getDocs(collection(db, 'spots'));
            const heatData = [];
            snaps.forEach(d => {
                const s = d.data();
                if (s.location && s.location.lat && s.location.lng) heatData.push([s.location.lat, s.location.lng, s.visits || 1]);
            });
            if (window.L && window.L.heatLayer) {
                if (heatLayer) map.removeLayer(heatLayer);
                heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);
            } else console.warn('Leaflet heat plugin not found');
        } catch (e) { console.error('renderHeatmap', e); }
    }

    const heatToggle = document.getElementById('heatmap-toggle');
    if (heatToggle) heatToggle.addEventListener('change', (e) => { if (e.target.checked) renderHeatmap(); else if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; } });

    // Parks markers (static dataset from parks.json)
    let parksMarkers = [];
    async function loadParksMarkers() {
        try {
            const res = await fetch('/parks.json');
            if (!res.ok) throw new Error('parks.json missing');
            const parks = await res.json();
            if (!Array.isArray(parks)) throw new Error('Invalid parks.json format');
            if (!window.map || !window.L) return;
            // Create marker for each park
            parksMarkers = parks.map(p => {
                if (!(p.lat && p.lng)) return null;
                const m = L.marker([p.lat, p.lng], { title: p.name })
                    .bindPopup(`<strong>${p.name}</strong><br/>${p.city || ''}`);
                m.addTo(window.map);
                return m;
            }).filter(Boolean);
            showToast(`Loaded ${parksMarkers.length} parks`, 'info');
        } catch (e) {
            console.warn('loadParksMarkers failed', e);
            showToast('Failed to load parks data', 'error');
        }
    }
    function clearParksMarkers() {
        parksMarkers.forEach(m => { try { window.map.removeLayer(m); } catch(_){} });
        parksMarkers = [];
    }
    const parksToggle = document.getElementById('parks-toggle');
    if (parksToggle) {
        parksToggle.addEventListener('change', (e) => {
            if (e.target.checked) loadParksMarkers(); 
            else clearParksMarkers();
        });
        if (parksToggle.checked) loadParksMarkers(); // Load on init
    }

    // Complete a challenge: award XP to a user
    async function callCompleteChallengeFunction(challengeId) {
        try {
            if (!window.firebaseInstances || !window.firebaseInstances.functions || !window.firebaseInstances.httpsCallable) return null;
            const fn = window.firebaseInstances.httpsCallable(window.firebaseInstances.functions, 'completeChallenge');
            const res = await fn({ challengeId });
            return res && res.data ? res.data : null;
        } catch (e) { 
            console.debug('callCompleteChallengeFunction failed', e); 
            return null; 
        }
    }
    async function completeChallenge(challengeId, userId) {
        try {
            if (!window.firebaseInstances) throw new Error('Firebase not initialized');
            const { db, doc, getDoc, updateDoc, runTransaction } = window.firebaseInstances;
            const challengeRef = doc(db, 'challenges', challengeId);
            const userRef = doc(db, 'users', userId);
            // Prefer server-side callable function if present (safer). If it fails, fallback to transactional client update.
            const fnRes = await callCompleteChallengeFunction(challengeId).catch(()=>null);
            if (fnRes && fnRes.success) {
                showToast(`Challenge complete! You earned ${fnRes.xp || 0} XP 🛹`, 'info');
                return;
            }

            if (runTransaction) {
                await runTransaction(db, async (tx) => {
                    const challengeSnap = await tx.get(challengeRef);
                    if (!challengeSnap.exists()) throw new Error('Challenge not found');
                    const xpEarned = (challengeSnap.data() && challengeSnap.data().xp) || 0;
                    tx.update(userRef, { xp: window.firebaseInstances.increment ? window.firebaseInstances.increment(xpEarned) : xpEarned });
                    const extra = {};
                    try { if (window.firebaseInstances.serverTimestamp) extra.completedAt = window.firebaseInstances.serverTimestamp(); } catch (e) {}
                    tx.update(challengeRef, { status: 'complete', completedBy: userId, ...extra });
                    // keep message outside tx
                });
                // best-effort: fetch xp value to display
                const cSnap = await getDoc(challengeRef);
                const xpEarned = (cSnap.exists() && cSnap.data() && cSnap.data().xp) || 0;
                showToast(`Challenge complete! You earned ${xpEarned} XP 🛹`, 'info');
            } else {
                // fallback sequential update
                const challengeSnap = await getDoc(challengeRef);
                if (!challengeSnap.exists()) throw new Error('Challenge not found');
                const xpEarned = (challengeSnap.data() && challengeSnap.data().xp) || 0;
                await updateDoc(userRef, { xp: window.firebaseInstances.increment ? window.firebaseInstances.increment(xpEarned) : xpEarned });
                const extra = {};
                try { if (window.firebaseInstances.serverTimestamp) extra.completedAt = window.firebaseInstances.serverTimestamp(); } catch (e) {}
                await updateDoc(challengeRef, { status: 'complete', completedBy: userId, ...extra });
                showToast(`Challenge complete! You earned ${xpEarned} XP 🛹`, 'info');
            }
        } catch (err) {
            console.error('completeChallenge error', err);
            showToast('Failed to complete challenge', 'error');
        }
    }

    // Wire the Mark Complete button to the last-created challenge (if available) and current user
    const completeBtn = document.getElementById('complete-challenge-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            const conf = document.getElementById('challenge-confirm');
            if (!conf || !conf.dataset || !conf.dataset.challengeId) return alert('No challenge selected or challenge not created from this device.');
            const challengeId = conf.dataset.challengeId;
            try {
                if (!window.firebaseInstances || !window.firebaseInstances.auth || !window.firebaseInstances.auth.currentUser) {
                    // try to sign in anonymously to acquire a user id
                    if (window.firebaseInstances && window.firebaseInstances.signInAnonymously) {
                        await window.firebaseInstances.signInAnonymously(window.firebaseInstances.auth).catch(()=>{});
                    }
                }
                const userId = (window.firebaseInstances && window.firebaseInstances.auth && window.firebaseInstances.auth.currentUser) ? window.firebaseInstances.auth.currentUser.uid : null;
                if (!userId) return alert('You must be signed in to complete a challenge.');
                await completeChallenge(challengeId, userId);
                await updateStreak(userId);
                // fetch latest user doc then check badges
                if (window.firebaseInstances && window.firebaseInstances.getDoc && window.firebaseInstances.doc) {
                    const uRef = window.firebaseInstances.doc(window.firebaseInstances.db, 'users', userId);
                    const uSnap = await window.firebaseInstances.getDoc(uRef);
                    const uData = uSnap.exists() ? uSnap.data() : {};
                    await checkAndAwardBadges(userId, uData);
                }
                // refresh leaderboard
                renderLeaderboard();
            } catch (e) { console.error('complete button handler', e); showToast('Failed to mark challenge complete', 'error'); }
        });
    }

    // Spot filter UI wiring
    const spotFilter = document.getElementById('spotFilter');
    if (spotFilter) {
        spotFilter.addEventListener('change', (e) => {
            const type = e.target.value;
            renderSpots(type);
        });
    }

    async function renderSpots(filterType = 'all') {
        try {
            if (!window.firebaseInstances) return;
            const { db, collection, getDocs } = window.firebaseInstances;
            const snaps = await getDocs(collection(db, 'spots'));
            // remove existing markers (assume `map` is global)
            if (window.map && map.eachLayer) {
                map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
            }
            snaps.forEach(d => {
                const spot = d.data();
                if (filterType === 'all' || spot.type === filterType) {
                    L.marker([spot.lat, spot.lng]).addTo(map).bindPopup(spot.name);
                }
            });
        } catch (err) {
            console.error('renderSpots error', err);
        }
    }

    // Leaderboard rendering
    async function renderLeaderboard() {
        try {
            if (!window.firebaseInstances) return;
            const { db, collection, getDocs, query, orderBy, limit } = window.firebaseInstances;
            const listEl = document.getElementById('leaderboard-list');
            if (!listEl) return;
            listEl.innerHTML = '';
            const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
            const snaps = await getDocs(q);
            snaps.forEach(docSnap => {
                const user = docSnap.data();
                const entry = document.createElement('div');
                entry.textContent = `${user.displayName || docSnap.id}: ${user.xp || 0} XP`;
                listEl.appendChild(entry);
            });
        } catch (err) {
            console.error('renderLeaderboard error', err);
        }
    }

    // Real-time subscriptions (use when auth is initialized)
    let leaderboardUnsub = null;
    let userUnsub = null;
    function subscribeLeaderboardRealtime() {
        try {
            if (!window.firebaseInstances) return;
            const { db, collection, query, orderBy, limit, onSnapshot } = window.firebaseInstances;
            const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
            leaderboardUnsub = onSnapshot(q, snapshot => {
                const listEl = document.getElementById('leaderboard-list');
                if (!listEl) return;
                listEl.innerHTML = '';
                snapshot.forEach(docSnap => {
                    const user = docSnap.data();
                    const entry = document.createElement('div');
                    entry.textContent = `${user.displayName || docSnap.id}: ${user.xp || 0} XP`;
                    listEl.appendChild(entry);
                });
            }, err => console.error('leaderboard onSnapshot error', err));
        } catch (e) { console.error('subscribeLeaderboardRealtime', e); }
    }

    function subscribeCurrentUserRealtime(uid) {
        try {
            if (!window.firebaseInstances) return;
            const { db, doc, onSnapshot } = window.firebaseInstances;
            const userRef = doc(db, 'users', uid);
            userUnsub = onSnapshot(userRef, snap => {
                const data = snap.exists() ? snap.data() : {};
                // update streak display
                const sd = document.getElementById('streak-display');
                if (sd) sd.textContent = `Streak: ${data.streak || 0} • XP: ${data.xp || 0}`;
                renderBadges(data.badges || {});
            }, err => console.error('user onSnapshot error', err));
        } catch (e) { console.error('subscribeCurrentUserRealtime', e); }
    }

    // Pending challenges realtime list and per-item complete button
    let pendingUnsub = null;
    function subscribePendingChallenges() {
        try {
            if (!window.firebaseInstances) return;
            const { db, collection, query, where, orderBy, onSnapshot } = window.firebaseInstances;
            // show open/pending challenges
            const q = query(collection(db, 'challenges'), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
            pendingUnsub = onSnapshot(q, snap => {
                const list = document.getElementById('pending-challenges-list');
                if (!list) return;
                list.innerHTML = '';
                if (snap.empty) { list.textContent = 'No pending challenges'; return; }
                snap.forEach(ch => {
                    const data = ch.data();
                    const row = document.createElement('div');
                    row.className = 'pending-row';
                    const txt = document.createElement('div');
                    txt.innerHTML = `<strong>${data.title || 'Challenge'}</strong><div style="font-size:.9rem;color:#444">${data.description || ''}</div><div style="font-size:.85rem;color:#666">XP: ${data.xp || 0} • Spot: ${data.spotId || ''}</div>`;
                    const btn = document.createElement('button');
                    btn.textContent = 'Complete';
                    btn.style.marginLeft = '0.6rem';
                    btn.addEventListener('click', async () => {
                        try {
                            // open confirmation modal instead of immediate action
                            const modal = document.getElementById('customModal');
                            const modalText = document.getElementById('modalText');
                            const modalTitle = document.getElementById('modalTitle');
                            if (modal && modalText && modalTitle) {
                                modalTitle.textContent = 'Complete Challenge?';
                                // Fix XSS vulnerability by using textContent
                                modalText.textContent = '';
                                const strong = document.createElement('strong');
                                strong.textContent = data.title || 'Challenge';
                                modalText.appendChild(strong);
                                modalText.appendChild(document.createElement('br'));
                                const desc = document.createTextNode(data.description || '');
                                modalText.appendChild(desc);
                                modalText.appendChild(document.createElement('br'));
                                const small = document.createElement('small');
                                small.textContent = `XP: ${data.xp || 0} • Spot: ${data.spotId || ''}`;
                                modalText.appendChild(small);
                                modal.hidden = false; modal.style.display = 'block';
                                // store action to run on confirm
                                window.__pendingConfirmAction = async () => {
                                    try {
                                        // ensure user signed-in
                                        if (!window.firebaseInstances.auth.currentUser && window.firebaseInstances.signInAnonymously) {
                                            await window.firebaseInstances.signInAnonymously(window.firebaseInstances.auth).catch(()=>{});
                                        }
                                        const uid = (window.firebaseInstances.auth && window.firebaseInstances.auth.currentUser) ? window.firebaseInstances.auth.currentUser.uid : null;
                                        if (!uid) { alert('Sign in required to complete challenge'); return; }
                                        await completeChallenge(ch.id, uid);
                                        await updateStreak(uid);
                                        const uRef = window.firebaseInstances.doc(window.firebaseInstances.db, 'users', uid);
                                        const uSnap = await window.firebaseInstances.getDoc(uRef);
                                        const uData = uSnap.exists() ? uSnap.data() : {};
                                        await checkAndAwardBadges(uid, uData);
                                        showToast('Challenge completed', 'info');
                                    } catch (e) { console.error('confirm complete', e); showToast('Failed to complete challenge', 'error'); }
                                };
                            }
                        } catch (e) { console.error('pending complete', e); showToast('Failed to open confirm', 'error'); }
                    });
                    row.appendChild(txt);
                    row.appendChild(btn);
                    list.appendChild(row);
                });
            }, err => console.error('pending challenges onSnapshot', err));
        } catch (e) { console.error('subscribePendingChallenges', e); }
    }

    // Rate a spot
    async function rateSpot(spotId, newRating) {
        try {
            if (!window.firebaseInstances) throw new Error('Firebase not initialized');
            const { db, doc, getDoc, updateDoc } = window.firebaseInstances;
            const spotRef = doc(db, 'spots', spotId);
            const spotSnap = await getDoc(spotRef);
            if (!spotSnap.exists()) throw new Error('Spot not found');
            const spot = spotSnap.data();
            const total = (spot.rating || 0) * (spot.ratingCount || 0);
            const updatedCount = (spot.ratingCount || 0) + 1;
            const updatedRating = (total + newRating) / updatedCount;
            await updateDoc(spotRef, { rating: updatedRating, ratingCount: updatedCount });
            showToast(`Thanks for rating! This spot now has ${updatedRating.toFixed(1)} stars`, 'info');
        } catch (err) {
            console.error('rateSpot error', err);
            showToast('Failed to rate spot', 'error');
        }
    }

    // Streak update utility after challenge completion
    async function updateStreak(userId) {
        try {
            if (!window.firebaseInstances) return;
            const { db, doc, getDoc, updateDoc } = window.firebaseInstances;
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            const user = userSnap.exists() ? userSnap.data() : {};
            const last = user.lastCompleted || 0;
            const now = Date.now();
            const oneDay = 86400000;
            if (!last || (now - last) > oneDay) {
                await updateDoc(userRef, { streak: 1, lastCompleted: now });
            } else if ((now - last) <= oneDay) {
                await updateDoc(userRef, { streak: (user.streak || 0) + 1, lastCompleted: now });
            }
        } catch (err) {
            console.error('updateStreak error', err);
        }
    }

    // Ensure we initialize auth and realtime subscriptions
    try {
        if (window.firebaseInstances && window.firebaseInstances.onAuthStateChanged && window.firebaseInstances.auth) {
            // attempt a sign-in if no current user
            try {
                if (!window.firebaseInstances.auth.currentUser && window.firebaseInstances.signInAnonymously) {
                    window.firebaseInstances.signInAnonymously(window.firebaseInstances.auth).catch(e => { console.debug('anonymous sign-in failed', e); });
                }
            } catch (e) { console.debug('signInAnonymously check failed', e); }

            window.firebaseInstances.onAuthStateChanged(window.firebaseInstances.auth, (user) => {
                // unsubscribe existing listeners
                try { if (leaderboardUnsub) leaderboardUnsub(); leaderboardUnsub = null; } catch (e) {}
                try { if (userUnsub) userUnsub(); userUnsub = null; } catch (e) {}
                try { if (pendingUnsub) pendingUnsub(); pendingUnsub = null; } catch (e) {}
                if (user && user.uid) {
                    subscribeLeaderboardRealtime();
                    subscribeCurrentUserRealtime(user.uid);
                    subscribePendingChallenges();
                }
            });
        }
    } catch (e) { console.error('auth init failed', e); }

    // Modal wiring: confirm/cancel
    try {
        const modal = document.getElementById('customModal');
        const modalClose = modal ? modal.querySelector('.close-button') : null;
        const modalCancel = document.getElementById('modalCancel');
        const modalConfirm = document.getElementById('modalConfirm');
        function closeModal() { if (modal) { modal.hidden = true; modal.style.display = 'none'; window.__pendingConfirmAction = null; } }
        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalCancel) modalCancel.addEventListener('click', closeModal);
        if (modalConfirm) modalConfirm.addEventListener('click', async () => {
            if (window.__pendingConfirmAction) {
                try { await window.__pendingConfirmAction(); } catch (e) { console.error('modal action failed', e); }
            }
            closeModal();
        });
    } catch (e) { console.error('modal wiring failed', e); }

    // Upload proof functionality
    async function uploadProof() {
        const proofFileInput = document.getElementById("proofFile");
        if (!proofFileInput) {
            console.error("proofFile element not found");
            return;
        }
        const file = proofFileInput.files[0];
        const activeChallenge = window.activeChallenge || {};
        const userId = window.currentUser?.uid; // Get from your auth system
        const challengeId = activeChallenge.id;

        if (!file) {
            showToast("Please select a file first", "error");
            return;
        }

        if (!userId || !challengeId) {
            showToast("Please select a challenge first", "error");
            return;
        }

        try {
            // Get current location
            let position;
            try {
                position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    });
                });
                showToast("Location captured successfully!", "success");
            } catch (geoError) {
                console.warn("Geolocation failed:", geoError);
                showToast("Location is required for proof upload. Please enable location permissions.", "error");
                return; // Exit early instead of using invalid 0,0 coordinates
            }

            const storageRef = ref(storage, `proofs/${userId}/${challengeId}`);
            await uploadBytes(storageRef, file);
            const mediaUrl = await getDownloadURL(storageRef);

            const proofRef = doc(db, `challenges/${challengeId}/proofs/${userId}`);
            await setDoc(proofRef, {
                mediaUrl,
                timestamp: Date.now(),
                verifiedBy: [],
                location: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                },
                spotName: activeChallenge.spotName || 'Unknown Spot',
                trickName: activeChallenge.trickName || 'Mystery Trick',
                userName: window.currentUser?.displayName || 'Anonymous Skater'
            });

            showToast("Proof uploaded successfully!", "success");
            await loadChallengeFeed(); // Refresh the feed
            ratReact("challengeComplete"); // Make the rat happy
        } catch (error) {
            console.error("Error uploading proof:", error);
            showToast("Failed to upload proof", "error");
        }
    }

    // Challenge feed functionality
    async function loadChallengeFeed() {
        try {
            if (!window.firebaseInstances) return;
            const { db, getDocs, collectionGroup, doc, setDoc } = window.firebaseInstances;
            const snapshot = await getDocs(collectionGroup(db, 'proofs'));
            const feed = document.getElementById("challenge-feed");
            if (!feed) return;
            feed.innerHTML = "<h2>Global Challenge Feed 🌍</h2>";

            // Clear existing challenge markers
            if (window.challengeMarkers) {
                window.challengeMarkers.forEach(marker => marker.remove());
            }
            window.challengeMarkers = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const card = document.createElement("div");
                card.className = "challenge-card";
                
                // Calculate time ago
                const timeAgo = getTimeAgo(data.timestamp);

                // Fix XSS vulnerability by creating elements programmatically
                const header = document.createElement('div');
                header.className = 'challenge-header';
                const strong1 = document.createElement('strong');
                strong1.textContent = data.userName || 'Unknown';
                header.appendChild(strong1);
                header.appendChild(document.createTextNode(' at '));
                const strong2 = document.createElement('strong');
                strong2.textContent = data.spotName || 'Unknown Spot';
                header.appendChild(strong2);
                card.appendChild(header);

                const img = document.createElement('img');
                img.src = data.mediaUrl || '';
                img.alt = 'Challenge proof';
                img.style.maxWidth = '100%';
                img.style.borderRadius = '4px';
                card.appendChild(img);

                const info = document.createElement('div');
                info.className = 'challenge-info';

                const trickP = document.createElement('p');
                trickP.className = 'trick-name';
                trickP.textContent = `🛹 ${data.trickName || 'Unknown Trick'}`;
                info.appendChild(trickP);

                const verifiedP = document.createElement('p');
                verifiedP.textContent = `✨ Verified by: ${data.verifiedBy?.length || 0} skaters`;
                info.appendChild(verifiedP);

                const timeP = document.createElement('p');
                timeP.textContent = `🕒 ${timeAgo}`;
                info.appendChild(timeP);

                if (data.location?.lat && data.location?.lng) {
                    const btn = document.createElement('button');
                    btn.className = 'location-btn';
                    btn.textContent = '📍 Show on map';
                    btn.addEventListener('click', () => showOnMap(data.location.lat, data.location.lng));
                    info.appendChild(btn);
                }

                card.appendChild(info);
                feed.appendChild(card);

                // Add marker to map if location exists
                if (window.map && data.location) {
                    // Fix XSS vulnerability by creating popup content with DOM methods
                    const popupDiv = document.createElement('div');
                    popupDiv.className = 'challenge-popup';
                    popupDiv.style.textAlign = 'center';

                    const h3 = document.createElement('h3');
                    h3.style.margin = '0 0 5px 0';
                    h3.textContent = data.userName || 'Unknown';
                    popupDiv.appendChild(h3);

                    const p1 = document.createElement('p');
                    p1.style.margin = '0 0 10px 0';
                    const strong = document.createElement('strong');
                    strong.textContent = data.trickName || 'Unknown Trick';
                    p1.appendChild(strong);
                    p1.appendChild(document.createElement('br'));
                    p1.appendChild(document.createTextNode('at ' + (data.spotName || 'Unknown Spot')));
                    popupDiv.appendChild(p1);

                    const img = document.createElement('img');
                    img.src = data.mediaUrl || '';
                    img.alt = 'Challenge proof';
                    img.style.maxWidth = '200px';
                    img.style.borderRadius = '8px';
                    img.style.margin = '5px 0';
                    popupDiv.appendChild(img);

                    const p2 = document.createElement('p');
                    p2.style.margin = '5px 0 0 0';
                    p2.style.color = '#666';
                    p2.textContent = `✨ ${data.verifiedBy?.length || 0} verifications`;
                    popupDiv.appendChild(p2);

                    const marker = L.marker([data.location.lat, data.location.lng])
                        .bindPopup(popupDiv, {
                            maxWidth: 250,
                            className: 'challenge-popup'
                        })
                        .addTo(window.map);
                    window.challengeMarkers.push(marker);
                }
            });
        } catch (error) {
            console.error("Error loading challenge feed:", error);
            showToast("Failed to load challenge feed", "error");
        }
    }

    // Helper function to show time ago
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'just now';
    }

    // Function to center map on a spot with smooth animation
    window.showOnMap = function(lat, lng) {
        if (window.map && lat && lng) {
            // Smooth pan to the location
            window.map.flyTo([lat, lng], 16, {
                duration: 1.5,
                easeLinearity: 0.25
            });

            // Find and open the corresponding marker popup
            window.challengeMarkers?.forEach(marker => {
                const markerLatLng = marker.getLatLng();
                if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
                    // Slight delay to open popup after animation
                    setTimeout(() => marker.openPopup(), 1500);
                }
            });

            // Visual feedback
            showToast("📍 Showing spot location", "info");
        }
    };

    // Initialize the feed with test data if empty
    const initializeTestData = async () => {
        if (!window.firebaseInstances) return;
        const { db, getDocs, collectionGroup, doc, setDoc } = window.firebaseInstances;
        const snapshot = await getDocs(collectionGroup(db, 'proofs'));
        if (snapshot.empty) {
            // Add some test challenges
            const testChallenges = [
                {
                    userName: "SkaterPro",
                    spotName: "Venice Beach Skatepark",
                    trickName: "360 Flip",
                    location: { lat: 33.9850, lng: -118.4695 },
                    mediaUrl: "https://picsum.photos/400/300", // Placeholder image
                    timestamp: Date.now() - 3600000, // 1 hour ago
                    verifiedBy: ["user1", "user2"]
                },
                {
                    userName: "RadRider",
                    spotName: "Brooklyn Banks",
                    trickName: "Kickflip Backside Tailslide",
                    location: { lat: 40.7127, lng: -74.0059 },
                    mediaUrl: "https://picsum.photos/400/300", // Placeholder image
                    timestamp: Date.now() - 86400000, // 1 day ago
                    verifiedBy: ["user1"]
                }
            ];

            for (const challenge of testChallenges) {
                const challengeId = Date.now().toString();
                const userId = challenge.userName.toLowerCase();
                const proofRef = doc(db, `challenges/${challengeId}/proofs/${userId}`);
                await setDoc(proofRef, challenge);
            }
        }
    }

    // Initialize the feed
    Promise.all([
        loadChallengeFeed(),
        initializeTestData()
    ]).catch(console.error);

    // Skate Rat functionality
    if (window.map) { // Check if map is initialized
        const ratIcon = L.icon({
            iconUrl: 'icons/skatequest-icon-192.png', // Using app icon as placeholder
            iconSize: [32, 32]
        });

        const userLocation = window.userLocation || [0, 0];
        const ratMarker = L.marker(userLocation, { icon: ratIcon }).addTo(window.map);

        window.updateRatPosition = function(newLocation) {
            ratMarker.setLatLng(newLocation);
        };

        window.ratReact = function(event) {
            if (event === "challengeComplete") {
                // Animate the rat (for now just bounce the marker)
                const originalPos = ratMarker.getLatLng();
                const bounceHeight = 0.0001; // Small coordinate difference for bounce

                let bounceCount = 0;
                const bounceInterval = setInterval(() => {
                    if (bounceCount >= 6) { // 3 full bounces
                        clearInterval(bounceInterval);
                        ratMarker.setLatLng(originalPos);
                        return;
                    }

                    const newLat = originalPos.lat + (bounceCount % 2 === 0 ? bounceHeight : 0);
                    ratMarker.setLatLng([newLat, originalPos.lng]);
                    bounceCount++;
                }, 100);
            }
        };
    }
});