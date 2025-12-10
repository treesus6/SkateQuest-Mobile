// Copyright (c) 2024 Your Name / SkateQuest. All Rights Reserved.

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase with timeout protection
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.warn('Firebase initialization timeout, proceeding anyway...');
            resolve();
        }, 10000); // 10 second timeout

        const interval = setInterval(() => {
            if (window.firebaseInstances) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve();
            }
        }, 100);
    });

    // Safely extract Firebase instances with error handling
    let db, auth, storage, doc, getDoc, setDoc, addDoc, onSnapshot, collection, serverTimestamp, updateDoc, increment, ref, uploadBytes, getDownloadURL, signInAnonymously, onAuthStateChanged, appId, query, where, getDocs;

    try {
        const instances = window.firebaseInstances || {};
        ({ db, auth, storage, doc, getDoc, setDoc, addDoc, onSnapshot, collection, serverTimestamp, updateDoc, increment, ref, uploadBytes, getDownloadURL, signInAnonymously, onAuthStateChanged, appId, query, where, getDocs } = instances);

        if (!db || !auth) {
            console.error('Firebase not properly initialized');
            showModal('App initialization error. Please refresh the page.');
            return;
        }
    } catch (error) {
        console.error('Error loading Firebase instances:', error);
        return;
    }

    // Initialize map with error handling
    let map;
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        // Use the map created in main.js
        map = window.map;
        
        if (!map) {
            throw new Error('Map not initialized in main.js');
        }

        // Expose map globally for error recovery
        window.map = map;
        // Make the map available to integrations (parks layer, etc.)
        window.sqMap = map;

        // Fix map rendering on resize
        window.addEventListener('resize', () => {
            if (map && typeof map.invalidateSize === 'function') {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    } catch (error) {
        console.error('Map initialization error:', error);
        showModal('Map failed to load. Please refresh the page.');
        return;
    }

    // When user clicks on the map while in add mode, show the add form at that coord
    if (map && typeof map.on === 'function') {
        map.on('click', (e) => {
        if (!mapClickToAdd) return;
        const { lat, lng } = e.latlng;
        // add or move temporary marker
        if (!tempAddMarker) tempAddMarker = L.marker([lat, lng]).addTo(map);
        else tempAddMarker.setLatLng([lat, lng]);
        showAddSpotForm(lat.toFixed(6), lng.toFixed(6));
        });
    }

    let skateSpots = [], userProfile = {}, markers = [];
    let skateShops = [], shopMarkers = [];
    let showShops = false;
    
    // Initialize marker cluster groups for better performance
    let markerClusterGroup = null;
    let shopMarkerClusterGroup = null;
    
    // Initialize clusters after map is ready
    if (typeof L !== 'undefined' && typeof L.markerClusterGroup === 'function') {
        markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 60,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        shopMarkerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
                return L.divIcon({ 
                    html: '<div style="background:#FF5722;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;">' + cluster.getChildCount() + '</div>',
                    className: 'shop-cluster',
                    iconSize: L.point(40, 40)
                });
            }
        });
        console.log('✓ Marker cluster groups initialized');
    } else {
        console.warn('MarkerCluster not available, falling back to standard markers');
    }
    let currentUserId = null, userLocationMarker = null, currentUserPosition = null;
    let mediaRecorder, recordedChunks = [], recordedVideoUrl = null, videoStream = null;
    let mapClickToAdd = false, tempAddMarker = null;

    const content = document.getElementById('content');
    const discoverBtn = document.getElementById('discoverBtn');
    const addSpotBtn = document.getElementById('addSpotBtn');
    const crewsBtn = document.getElementById('crewsBtn');
    const eventsBtn = document.getElementById('eventsBtn');
    const shopsBtn = document.getElementById('shopsBtn');
    const charityBtn = document.getElementById('charityBtn');
    const profileBtn = document.getElementById('profileBtn');
    const centerMapBtn = document.getElementById('centerMapBtn');
    const legalBtn = document.getElementById('legalBtn');
    const modal = document.getElementById('customModal');
    const modalText = document.getElementById('modalText');
    const closeButton = document.querySelector('.close-button');
    const cameraModal = document.getElementById('cameraModal');
    const cameraPreview = document.getElementById('cameraPreview');
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const saveVideoBtn = document.getElementById('saveVideoBtn');
    const cancelCameraBtn = document.getElementById('cancelCameraBtn');
    const legalModal = document.getElementById('legalModal');
    const legalText = document.getElementById('legalText');
    const shopsToggle = document.getElementById('shops-toggle');

    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => {
        btn.closest('.modal').style.display = 'none';
    });
    window.onclick = (event) => { if (event.target.classList.contains('modal')) event.target.style.display = "none"; };
    function showModal(message) { 
        if (modalText && modal) {
            modalText.textContent = message;
            modal.style.display = "block";
        } else {
            console.warn('Modal elements not found:', message);
        }
    }
    function setActiveButton(activeBtn) {
        if (!activeBtn) return;
        [discoverBtn, addSpotBtn, crewsBtn, eventsBtn, shopsBtn, charityBtn, profileBtn, legalBtn].filter(btn => btn).forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    console.log('Button check:', {discoverBtn, addSpotBtn, crewsBtn, eventsBtn, shopsBtn, charityBtn, profileBtn, legalBtn});

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUserId = user.uid;
            setupRealtimeListeners();
            startGpsTracking();
            document.querySelectorAll('nav button').forEach(b => b.disabled = false);
            if (discoverBtn) discoverBtn.click();
        } else {
            currentUserId = null;
            document.querySelectorAll('nav button').forEach(b => b.disabled = true);
        }
    });

    async function signIn() {
        try {
            if (!auth) {
                console.error('Auth not initialized');
                return;
            }
            await window.firebaseRetry(async () => {
                await signInAnonymously(auth);
            }, 'Sign in');
        } catch (error) {
            console.error("Error signing in:", error);
            showModal("Could not connect. Check your internet and refresh.");
        }
    }

    if (legalBtn && legalText && legalModal) {
    }
    if (challengesBtn) {
        challengesBtn.onclick = () => {
            setActiveButton(challengesBtn);
            renderChallenges();
        };
    }

    if (profileBtn) {
        profileBtn.onclick = () => {
            setActiveButton(profileBtn);
            renderProfile();
        };
    }


    if (legalBtn && legalText && legalModal) {
        legalBtn.onclick = () => {
            setActiveButton(legalBtn);
            legalText.innerHTML = `
            <p><em>Last Updated: November 30, 2024</em></p>

            <div style="background:#ffebee;border-left:4px solid #c62828;padding:1rem;margin:1rem 0;">
                <h3 style="color:#c62828;margin-top:0;">⚠️ CRITICAL LEGAL DISCLAIMER</h3>
                <p><strong>READ CAREFULLY BEFORE USING THIS APP</strong></p>
                <p>By using SkateQuest, you acknowledge that:</p>
                <ul>
                    <li>Skateboarding is EXTREMELY DANGEROUS and can result in SERIOUS INJURY OR DEATH</li>
                    <li>You use this app and participate in skateboarding AT YOUR OWN RISK</li>
                    <li>SkateQuest, its creators, operators, and contributors are NOT LIABLE for ANY injuries, damages, deaths, or legal consequences</li>
                    <li>You are SOLELY RESPONSIBLE for your own safety and legal compliance</li>
                    <li>These terms are LEGALLY BINDING - if you do not agree, DO NOT USE THIS APP</li>
                </ul>
                <p><strong>Consult a legal professional for complete legal advice.</strong></p>
            </div>

            <hr>

            <h3>Terms of Service</h3>
            <p>Welcome to SkateQuest (the "App"). By accessing or using our App, you agree to be bound by these Terms of Service and our Privacy Policy. IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THIS APP.</p>

            <h4>1. Complete Assumption of Risk & Waiver of Liability</h4>
            <p><strong>SKATEBOARDING IS EXTREMELY DANGEROUS.</strong> Skateboarding is an activity with inherent and significant risks including but not limited to: property damage, minor injuries, serious bodily injury, paralysis, permanent disability, and death.</p>
            <p>By using this App, you EXPRESSLY, VOLUNTARILY, and KNOWINGLY:</p>
            <ul>
                <li>ASSUME ALL RISKS associated with skateboarding and use of this application</li>
                <li>WAIVE ANY AND ALL CLAIMS against SkateQuest, its creators, contributors, operators, sponsors, and affiliates</li>
                <li>RELEASE AND HOLD HARMLESS all parties associated with SkateQuest from any liability for injuries, damages, or death</li>
                <li>AGREE that you are solely responsible for your own safety and the safety of others</li>
                <li>ACKNOWLEDGE that SkateQuest provides NO warranties regarding the safety, legality, or condition of any locations</li>
            </ul>
            <p><strong>This waiver applies to all claims, whether based on negligence, breach of warranty, or any other legal theory.</strong></p>

            <h4>2. Age Requirements & Parental Consent</h4>
            <p>If you are under 18 years of age, you MUST have your parent or legal guardian's permission to use this app. By using this app as a minor, you confirm that your parent/guardian has read and agreed to these terms on your behalf. Parents/guardians of minors using this app accept full responsibility and liability for their child's use of the app and participation in skateboarding activities.</p>

            <h4>3. User Responsibilities and Conduct</h4>
            <ul>
                <li><strong>Safety First:</strong> ALWAYS wear appropriate protective gear including helmet, knee pads, elbow pads, and wrist guards. Failure to wear safety equipment significantly increases risk of injury or death.</li>
                <li><strong>Respect Property:</strong> DO NOT TRESPASS on private property. Only add and visit spots that are legally accessible to the public. You are SOLELY RESPONSIBLE for any legal consequences including arrest, fines, or civil liability for trespassing or property damage.</li>
                <li><strong>Obey ALL Laws:</strong> You MUST obey all local, state, and federal laws including traffic laws, skateboarding ordinances, and property regulations. SkateQuest is NOT responsible for any legal violations.</li>
                <li><strong>Content Standards:</strong> Do not create spots or upload videos that are dangerous, illegal, obscene, promote trespassing, or encourage reckless behavior. We reserve the right to remove any content and terminate accounts without notice.</li>
                <li><strong>No Encouragement of Illegal Activity:</strong> Users who post content encouraging illegal activities may be reported to law enforcement.</li>
            </ul>

            <h4>4. User-Generated Content</h4>
            <p>You grant SkateQuest a worldwide, non-exclusive, royalty-free, perpetual license to use, display, modify, and share the content (spots, videos, QR codes) you upload within the App. You affirm that you have the necessary rights to the content you post and that your content does not violate any third-party rights or laws.</p>

            <h4>5. Charity QR Code System & Donations</h4>
            <ul>
                <li><strong>Demo Mode:</strong> Currently operating in DEMO MODE - NO REAL PAYMENTS are processed. This is a proof-of-concept system.</li>
                <li><strong>Not a Nonprofit:</strong> SkateQuest is NOT a registered 501(c)(3) nonprofit organization. Any future donations are NOT tax-deductible.</li>
                <li><strong>No Guarantees:</strong> We make NO GUARANTEES about fund distribution, specific outcomes, timelines, or that any skateboards will actually be provided. All contributions are FINAL and NON-REFUNDABLE.</li>
                <li><strong>QR Code Placement:</strong> When hiding QR codes, you MUST comply with ALL laws. DO NOT trespass, place codes in dangerous locations, or create hazards. You are SOLELY LIABLE for any consequences.</li>
                <li><strong>Trick Challenges Optional:</strong> Any trick challenges are SUGGESTIONS ONLY. You are NOT required to attempt any tricks and are SOLELY RESPONSIBLE for your safety if you choose to do so.</li>
                <li><strong>No Responsibility for Finders:</strong> SkateQuest is NOT responsible for injuries sustained by people attempting trick challenges or searching for QR codes.</li>
            </ul>

            <h4>6. Limitation of Liability & Indemnification</h4>
            <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong> SkateQuest and its creators, operators, contributors, sponsors, and affiliates shall NOT be liable for ANY direct, indirect, incidental, special, consequential, or punitive damages arising from your use of this app, including but not limited to personal injury, death, property damage, lost profits, or legal fees.</p>
            <p><strong>YOU AGREE TO INDEMNIFY AND HOLD HARMLESS</strong> SkateQuest and all associated parties from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from your use of the app or violation of these terms.</p>

            <h4>7. Severability & Entire Agreement</h4>
            <p>If any provision of these terms is found to be unenforceable, the remaining provisions shall continue in full force. These terms constitute the entire agreement between you and SkateQuest.</p>

            <h4>8. Changes to Terms</h4>
            <p>We reserve the right to modify these terms at any time without notice. Continued use of the app constitutes acceptance of modified terms.</p>

            <h4>9. Governing Law & Dispute Resolution</h4>
            <p>These terms shall be governed by the laws of the State of Oregon, United States, without regard to its conflict of law provisions. Any disputes shall be resolved through binding arbitration in Oregon, and you waive any right to a jury trial.</p>

            <hr>

            <h3>Privacy Policy</h3>
            <p>Your privacy is important to us. This policy outlines how we handle your data.</p>

            <h4>1. Information We Collect</h4>
            <ul>
                <li><strong>User Account:</strong> To save your progress (XP, tricks, crews, sessions), we create a user account with Supabase Authentication. We assign you a unique, anonymous ID and do not require personal information like your name or email unless you choose to provide it.</li>
                <li><strong>Geolocation Data:</strong> We require access to your device's GPS to show your live location on the map and enable location-based features. Your current location is used for real-time features but is not stored historically unless you explicitly save a spot or session location.</li>
                <li><strong>Uploaded Content:</strong> We collect and store the skate spots, videos, crew information, events, and sessions you voluntarily create. This content is stored in Supabase (PostgreSQL) and may be publicly visible to other users.</li>
                <li><strong>Charity Participation:</strong> If you purchase or scan charity QR codes, we store transaction records, QR code details, donation amounts, and participation data to track charitable impact and prevent fraud.</li>
                <li><strong>Session Data:</strong> We track your skate sessions including duration, location, and XP earned to provide session history and statistics.</li>
            </ul>

            <h4>2. How We Use Information</h4>
            <p>Your data is used exclusively to operate, maintain, and improve the SkateQuest app and charity system. We do not sell or share your data with third-party marketers. Charity data may be aggregated anonymously for impact reporting.</p>

            <h4>3. Data Security</h4>
            <p>We use Supabase (built on PostgreSQL) to store and protect your data, with Row Level Security (RLS) policies ensuring users can only access their own private data. All connections use encrypted HTTPS.</p>

            <h4>4. Your Rights</h4>
            <p>You may request deletion of your account and associated data at any time by contacting us. Note that some aggregated charity statistics may be retained for transparency reporting.</p>
        `;
            legalModal.style.display = 'block';
        };
    }

    signIn();

    function setupRealtimeListeners() {
        if (!currentUserId) return;
        const spotsPath = `/artifacts/${appId}/public/data/skate_spots`;
        onSnapshot(collection(db, spotsPath), s => { skateSpots = []; s.forEach(d => skateSpots.push({ id: d.id, ...d.data() })); renderMarkers(); }, e => console.error(e));
        
        // Listen to skate shops collection
        onSnapshot(collection(db, 'shops'), s => { 
            skateShops = []; 
            s.forEach(d => skateShops.push({ id: d.id, ...d.data() })); 
            renderShopMarkers(); 
        }, e => console.error('Error loading shops:', e));
        
        const profilePath = `/artifacts/${appId}/users/${currentUserId}/profile/data`;
        onSnapshot(doc(db, profilePath), async d => {
            if (d.exists()) { userProfile = d.data(); } 
            else { const p = { username: `Skater${Math.floor(Math.random() * 1000)}`, level: 1, xp: 0, spotsAdded: 0, challengesCompleted: [], createdAt: serverTimestamp() }; await setDoc(doc(db, profilePath), p); userProfile = p; }
            if (profileBtn.classList.contains('active')) renderProfile();
        }, e => console.error(e));
    }

    function startGpsTracking() {
        if (!navigator.geolocation) return showModal("Geolocation is not supported.");
        const userIcon = L.divIcon({ className: 'user-location-marker', iconSize: [18, 18] });
        navigator.geolocation.watchPosition(pos => {
            currentUserPosition = [pos.coords.latitude, pos.coords.longitude];
            if (!userLocationMarker) { userLocationMarker = L.marker(currentUserPosition, { icon: userIcon }).addTo(map); map.setView(currentUserPosition, 16); } 
            else { userLocationMarker.setLatLng(currentUserPosition); }
        }, e => { if (e.code === 1) showModal("Please enable location services."); }, { enableHighAccuracy: true });
    }

    if (centerMapBtn) {
        centerMapBtn.onclick = () => {
            if (currentUserPosition) map.setView(currentUserPosition, 16);
            else showModal("Finding your location...");
        };
    }

    function renderMarkers() {
        // Clear existing markers
        if (markerClusterGroup) {
            markerClusterGroup.clearLayers();
            if (map.hasLayer(markerClusterGroup)) {
                map.removeLayer(markerClusterGroup);
            }
        } else {
            markers.forEach(m => map.removeLayer(m));
        }
        markers = [];
        
        skateSpots.forEach(spot => {
            if (spot.coords && spot.coords.latitude && spot.coords.longitude) {
                const marker = L.marker([spot.coords.latitude, spot.coords.longitude]);
        
                let popupContent = `
                    <strong>${spot.name}</strong><br/>
                    ${spot.imageUrl ? `<img src="${spot.imageUrl}" alt="${spot.name}" style="max-width:150px;border-radius:8px;margin-top:5px;"/><br/>` : ''}
                    Difficulty: ${spot.difficulty}<br/>
                    Tricks: ${spot.tricks ? spot.tricks.join(', ') : 'None'}<br/>
                    ${spot.videoUrl ? `<br/><video src="${spot.videoUrl}" controls></video><br/>` : ''}

                    <h4>Challenges:</h4>
                    <ul id="challengesList-${spot.id}"></ul>
                    <br/>

                    <form id="addChallengeForm-${spot.id}">
                        <label>New Challenge:<br/>
                        <input type="text" id="challengeText-${spot.id}" placeholder="e.g., Land a kickflip down the stairs" required></label>
                        <button type="submit">Add Challenge</button>
                    </form>
                `;
        
                marker.bindPopup(popupContent);
                markers.push(marker);
                
                // Add to cluster group or map
                if (markerClusterGroup) {
                    markerClusterGroup.addLayer(marker);
                } else {
                    marker.addTo(map);
                }
        
                marker.on('popupopen', () => {
                    // Add the spot ID to the popup's HTML element
                    marker.getPopup()._content.parentElement.dataset.spotId = spot.id;
                    const form = document.getElementById(`addChallengeForm-${spot.id}`);
                    form.onsubmit = (e) => {
                        e.preventDefault();
                        addChallengeToSpot(spot.id);
                    };
                    renderChallengesForSpot(spot.id);
                });
            }
        });
        
        // Add cluster group to map
        if (markerClusterGroup && markers.length > 0) {
            map.addLayer(markerClusterGroup);
            console.log(`✓ Rendered ${markers.length} skate spot markers with clustering`);
        } else if (markers.length > 0) {
            console.log(`✓ Rendered ${markers.length} skate spot markers`);
        }
    }

    // Helper function to escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Render skate shop markers on the map
    function renderShopMarkers() {
        // Remove existing shop markers
        if (shopMarkerClusterGroup) {
            shopMarkerClusterGroup.clearLayers();
            if (map.hasLayer(shopMarkerClusterGroup)) {
                map.removeLayer(shopMarkerClusterGroup);
            }
        } else {
            shopMarkers.forEach(m => map.removeLayer(m));
        }
        shopMarkers = [];
        
        // Only render if shops toggle is enabled
        if (!showShops) return;
        
        skateShops.forEach(shop => {
            if (shop.coords && shop.coords.latitude && shop.coords.longitude) {
                // Create custom icon for shops (different from skate spots)
                const shopIcon = L.divIcon({
                    className: 'shop-marker',
                    html: '<div style="background:#4CAF50;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:18px;">🛒</span></div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                const marker = L.marker([shop.coords.latitude, shop.coords.longitude], { icon: shopIcon });
        
                let popupContent = `
                    <div style="min-width:200px;">
                        <h3 style="margin:0 0 10px 0;color:#4CAF50;">🛹 ${escapeHtml(shop.name)}</h3>
                        ${shop.address ? `<p style="margin:5px 0;"><strong>📍 Address:</strong><br/>${escapeHtml(shop.address)}</p>` : ''}
                        ${shop.phone ? `<p style="margin:5px 0;"><strong>📞 Phone:</strong><br/><a href="tel:${escapeHtml(shop.phone)}">${escapeHtml(shop.phone)}</a></p>` : ''}
                        ${shop.website ? `<p style="margin:5px 0;"><strong>🌐 Website:</strong><br/><a href="${escapeHtml(shop.website)}" target="_blank" rel="noopener">${escapeHtml(shop.website)}</a></p>` : ''}
                        ${shop.hours ? `<p style="margin:5px 0;"><strong>🕐 Hours:</strong><br/>${escapeHtml(shop.hours)}</p>` : ''}
                        ${shop.verified ? '<p style="margin:5px 0;color:#4CAF50;">✓ Verified Shop</p>' : ''}
                    </div>
                `;
        
                marker.bindPopup(popupContent);
                shopMarkers.push(marker);
                
                // Add to cluster group or map
                if (shopMarkerClusterGroup) {
                    shopMarkerClusterGroup.addLayer(marker);
                } else {
                    marker.addTo(map);
                }
            }
        });
        
        // Add shop cluster group to map
        if (shopMarkerClusterGroup && shopMarkers.length > 0) {
            map.addLayer(shopMarkerClusterGroup);
            console.log(`✓ Rendered ${shopMarkers.length} shop markers with clustering`);
        } else if (shopMarkers.length > 0) {
            console.log(`✓ Rendered ${shopMarkers.length} shop markers`);
        }
    }

    // New function to add a challenge to a spot
    async function addChallengeToSpot(spotId) {
        if (!currentUserId) {
            showModal("You must be logged in to add a challenge.");
            return;
        }
        const challengeText = document.getElementById(`challengeText-${spotId}`).value;
        if (!challengeText.trim()) {
            return;
        }

        try {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges`), {
                description: challengeText,
                addedBy: currentUserId,
                createdAt: serverTimestamp(),
                completedBy: []
            });
            document.getElementById(`challengeText-${spotId}`).value = '';
            showModal("Challenge added!");
        } catch (error) {
            console.error("Error adding challenge: ", error);
            showModal("Failed to add challenge.");
        }
    }

    // Updated function to render challenges for a specific spot with a "Complete" button
    function renderChallengesForSpot(spotId) {
        const challengesList = document.getElementById(`challengesList-${spotId}`);
        if (!challengesList) return;

        onSnapshot(collection(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges`), (snapshot) => {
            challengesList.innerHTML = '';
            snapshot.forEach(doc => {
                const challenge = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `
                    ${challenge.description}
                    <button class="complete-challenge-btn" data-challenge-id="${doc.id}">Complete</button>
                `;
                challengesList.appendChild(li);
            });
        }, (error) => {
            console.error("Error getting challenges: ", error);
            challengesList.innerHTML = '<li>Failed to load challenges.</li>';
        });
    }

    // New event listener for all "Complete" buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('complete-challenge-btn')) {
            const challengeId = e.target.dataset.challengeId;
            const spotId = e.target.closest('.leaflet-popup-pane').dataset.spotId;
            completeChallenge(spotId, challengeId);
        }
    });

    // New function to handle challenge completion
    async function completeChallenge(spotId, challengeId) {
        if (!currentUserId) {
            showModal("You must be logged in to complete a challenge.");
            return;
        }
        
        showModal("Completing challenge... please wait.");
        
        try {
            const challengeRef = doc(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges/${challengeId}`);
            const challengeDoc = await getDoc(challengeRef);
            const challengeData = challengeDoc.data();
            
            // Add user to the list of people who have completed this challenge
            const completedBy = [...(challengeData.completedBy || []), currentUserId];
            await updateDoc(challengeRef, { completedBy: completedBy });

            // Reward the user with XP
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), { xp: increment(100) });

            showModal("Challenge completed! You earned 100 XP!");
        } catch (error) {
            console.error("Error completing challenge: ", error);
            showModal("Failed to complete challenge.");
        }
    }

    if (discoverBtn) {
        discoverBtn.onclick = () => { setActiveButton(discoverBtn); content.innerHTML = '<p>Use the map to discover skate spots. Tap markers for details.</p>'; };
    }

    // Helper to show the Add Spot form for given coordinates
    function showAddSpotForm(lat = '', lng = '') {
        setActiveButton(addSpotBtn);
        recordedVideoUrl = null;
        content.innerHTML = `
            <h3>Add New Spot</h3>
            <p>Tap Save to add the spot at the selected location.</p>
            <form id="addSpotForm">
                <label>Name:<br/><input type="text" id="spotName" required /></label>
                <label>Latitude:<br/><input type="number" step="any" id="spotLat" value="${lat}" required /></label>
                <label>Longitude:<br/><input type="number" step="any" id="spotLng" value="${lng}" required /></label>
                <label>Difficulty:<br/><select id="spotDifficulty"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
                <label>Tricks (comma separated):<br/><input type="text" id="spotTricks" /></label>
                <label>Photo (optional):<br/><input type="file" id="spotImageInput" accept="image/*" /></label>
                <div id="spotImagePreview"></div>
                <button type="button" id="recordVideoBtn">Record Trick 🎥</button>
                <div id="videoStatus"></div>
                <button type="submit">Add Spot</button>
                <button type="button" id="cancelAddSpotBtn">Cancel</button>
            </form>
        `;
        document.getElementById('recordVideoBtn').onclick = () => openCamera();
        document.getElementById('cancelAddSpotBtn').onclick = () => { 
            mapClickToAdd = false; 
            if (tempAddMarker) { map.removeLayer(tempAddMarker); tempAddMarker = null; }
            content.innerHTML = ''; 
            setActiveButton(discoverBtn); 
        };

        // Spot image handling
        const spotImageInput = document.getElementById('spotImageInput');
        const spotImagePreview = document.getElementById('spotImagePreview');
        let selectedSpotImageFile = null;
        spotImageInput.onchange = (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) { selectedSpotImageFile = null; spotImagePreview.innerHTML = ''; return; }
            // quick client-side checks
            if (f.size > 5 * 1024 * 1024) { showModal('Image too large (max 5MB).'); spotImageInput.value = ''; selectedSpotImageFile = null; spotImagePreview.innerHTML = ''; return; }
            if (!f.type.startsWith('image/')) { showModal('Only image files are allowed.'); spotImageInput.value = ''; selectedSpotImageFile = null; spotImagePreview.innerHTML = ''; return; }
            selectedSpotImageFile = f;
            spotImagePreview.innerHTML = `<img src="${URL.createObjectURL(f)}" style="max-width:200px;border-radius:8px;margin-top:0.5em;"/>`;
        };

        document.getElementById('addSpotForm').onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return showModal("You must be signed in.");
            const newSpot = {
                name: document.getElementById('spotName').value.trim(),
                coords: { latitude: parseFloat(document.getElementById('spotLat').value), longitude: parseFloat(document.getElementById('spotLng').value) },
                difficulty: document.getElementById('spotDifficulty').value,
                tricks: document.getElementById('spotTricks').value.split(',').map(t => t.trim()).filter(Boolean),
                addedBy: currentUserId, createdAt: serverTimestamp(),
                ...(recordedVideoUrl && { videoUrl: recordedVideoUrl })
            };
            try {
                showModal('Adding spot...');

                // If a spot image was selected, upload it first and attach URL with retry
                if (selectedSpotImageFile) {
                    await window.firebaseRetry(async () => {
                        const imgName = `${currentUserId}/${Date.now()}_${selectedSpotImageFile.name}`;
                        const imgRef = ref(storage, `spot_images/${imgName}`);
                        const uploadResult = await uploadBytes(imgRef, selectedSpotImageFile);
                        newSpot.imageUrl = await getDownloadURL(uploadResult.ref);
                    }, 'Image upload');
                }

                // Add spot with retry
                await window.firebaseRetry(async () => {
                    await addDoc(collection(db, `/artifacts/${appId}/public/data/skate_spots`), newSpot);
                    await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), { spotsAdded: increment(1), xp: increment(100) });
                }, 'Add spot');

                showModal('Spot added! You earned 100 XP!');
                mapClickToAdd = false;
                if (tempAddMarker) { map.removeLayer(tempAddMarker); tempAddMarker = null; }
                if (discoverBtn) discoverBtn.click();
            } catch (error) {
                console.error("Error adding spot: ", error);
                showModal("Failed to add spot. Please check your connection and try again.");
            }
        };
    }

    if (addSpotBtn) {
        addSpotBtn.onclick = () => {
            // Toggle map-click-to-add mode. When enabled, user clicks map to place a spot.
            if (mapClickToAdd) {
                mapClickToAdd = false;
                if (tempAddMarker) { map.removeLayer(tempAddMarker); tempAddMarker = null; }
                setActiveButton(null);
                content.innerHTML = '<p>Map click-to-add canceled.</p>';
                return;
            }
            mapClickToAdd = true;
            setActiveButton(addSpotBtn);
            content.innerHTML = '<p>Click anywhere on the map to add a new spot. Click the "Add Spot" button again to cancel.</p>';
        };
    }

    // Crews button handler
    if (crewsBtn) {
        crewsBtn.onclick = () => {
            setActiveButton(crewsBtn);
            renderCrewsPanel();
        };
    }

    // Events button handler
    if (eventsBtn) {
        eventsBtn.onclick = () => {
            setActiveButton(eventsBtn);
            renderEventsPanel();
        };
    }

    // Shops button handler
    if (shopsBtn) {
        shopsBtn.onclick = () => {
            setActiveButton(shopsBtn);
            renderShopsPanel();
        };
    }

    // Charity button handler
    if (charityBtn) {
        charityBtn.onclick = async () => {
            setActiveButton(charityBtn);
            try {
                const { renderCharityShop } = await import('./charity-qr.js');
                await renderCharityShop();
            } catch (error) {
                console.error('Error loading charity module:', error);
                content.innerHTML = '<div style="padding:1rem;"><h2>Error</h2><p>Failed to load charity module. Please refresh the page.</p></div>';
            }
        };
    }

    // Shops toggle handler
    if (shopsToggle) {
        shopsToggle.onchange = () => {
            showShops = shopsToggle.checked;
            renderShopMarkers();
        };
    }

    function renderShopsPanel() {
        content.innerHTML = `
            <div style="padding:1rem;">
                <h2>🛹 Skate Shops</h2>
                <p>Discover local skate shops near you!</p>
                
                <div style="margin-bottom:1rem;">
                    <label style="display:flex;align-items:center;gap:0.5rem;">
                        <input type="checkbox" id="toggle-shops-panel" ${showShops ? 'checked' : ''} />
                        Show shops on map
                    </label>
                </div>

                <div id="shops-list" style="margin-top:1rem;">
                    <h3>Nearby Shops</h3>
                    <div id="shops-items"></div>
                </div>

                <hr style="margin:2rem 0;" />

                <h3>Add a Skate Shop</h3>
                <form id="add-shop-form" style="display:flex;flex-direction:column;gap:0.8rem;">
                    <label>
                        Shop Name *
                        <input type="text" id="shop-name" required placeholder="e.g., Local Skate Shop" />
                    </label>
                    <label>
                        Address *
                        <input type="text" id="shop-address" required placeholder="123 Main St, Portland, OR" />
                    </label>
                    <label>
                        Latitude *
                        <input type="number" id="shop-lat" step="any" required placeholder="45.5231" />
                    </label>
                    <label>
                        Longitude *
                        <input type="number" id="shop-lng" step="any" required placeholder="-122.6765" />
                    </label>
                    <label>
                        Phone
                        <input type="tel" id="shop-phone" placeholder="(555) 123-4567" />
                    </label>
                    <label>
                        Website
                        <input type="url" id="shop-website" placeholder="https://example.com" />
                    </label>
                    <label>
                        Instagram Username (without @)
                        <input type="text" id="shop-instagram" placeholder="skate_shop_official" />
                    </label>
                    <label>
                        Hours
                        <input type="text" id="shop-hours" placeholder="Mon-Fri 10am-8pm, Sat-Sun 11am-6pm" />
                    </label>
                    <button type="submit" style="background:#4CAF50;color:white;padding:0.8rem;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
                        Add Shop
                    </button>
                </form>
            </div>
        `;

        // Hook up toggle in panel
        const toggleShopsPanel = document.getElementById('toggle-shops-panel');
        if (toggleShopsPanel) {
            toggleShopsPanel.onchange = () => {
                showShops = toggleShopsPanel.checked;
                if (shopsToggle) shopsToggle.checked = showShops;
                renderShopMarkers();
            };
        }

        // Display shops list
        renderShopsList();

        // Handle form submission
        const form = document.getElementById('add-shop-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await addShop();
            };
        }
    }

    function renderShopsList() {
        const shopsItems = document.getElementById('shops-items');
        if (!shopsItems) return;

        if (skateShops.length === 0) {
            shopsItems.innerHTML = '<p style="color:#666;">No shops added yet. Be the first to add one!</p>';
            return;
        }

        shopsItems.innerHTML = skateShops.map((shop, index) => `
            <div style="padding:1.2rem;margin-bottom:1rem;border:2px solid #FF5722;border-radius:12px;background:linear-gradient(135deg, #fff 0%, #f5f5f5 100%);box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <h4 style="margin:0 0 0.8rem 0;color:#FF5722;font-size:1.2rem;">${escapeHtml(shop.name)}</h4>
                ${shop.verified ? '<span style="background:#4CAF50;color:white;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:bold;">✓ VERIFIED</span>' : ''}

                <div style="margin-top:0.8rem;display:flex;flex-direction:column;gap:0.5rem;">
                    ${shop.address ? `<div style="display:flex;align-items:start;gap:0.5rem;">
                        <span style="font-size:1.2rem;">📍</span>
                        <span style="color:#333;">${escapeHtml(shop.address)}</span>
                    </div>` : ''}

                    ${shop.hours ? `<div style="display:flex;align-items:start;gap:0.5rem;">
                        <span style="font-size:1.2rem;">🕐</span>
                        <span style="color:#555;">${escapeHtml(shop.hours)}</span>
                    </div>` : ''}
                </div>

                <!-- Action Buttons -->
                <div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.5rem;">
                    ${shop.website ? `
                        <a href="${escapeHtml(shop.website)}" target="_blank" rel="noopener"
                           style="flex:1;min-width:120px;padding:0.6rem;background:#4CAF50;color:white;text-decoration:none;border-radius:8px;text-align:center;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:0.3rem;">
                            🌐 Visit Website
                        </a>
                    ` : ''}

                    ${shop.phone ? `
                        <a href="tel:${escapeHtml(shop.phone)}"
                           style="flex:1;min-width:120px;padding:0.6rem;background:#2196F3;color:white;text-decoration:none;border-radius:8px;text-align:center;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:0.3rem;">
                            📞 Call Now
                        </a>
                    ` : ''}

                    <button data-shop-index="${index}" class="view-shop-btn"
                            style="flex:1;min-width:120px;padding:0.6rem;background:#FF5722;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem;">
                        🗺️ View on Map
                    </button>

                    ${shop.instagram ? `
                        <a href="https://instagram.com/${escapeHtml(shop.instagram)}" target="_blank" rel="noopener"
                           style="padding:0.6rem;background:linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);color:white;text-decoration:none;border-radius:8px;font-weight:bold;display:flex;align-items:center;justify-content:center;">
                            📸 IG
                        </a>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        // Add event listeners to view shop buttons
        document.querySelectorAll('.view-shop-btn').forEach(btn => {
            btn.onclick = (e) => {
                const shopIndex = parseInt(e.target.getAttribute('data-shop-index'));
                const shop = skateShops[shopIndex];
                if (shop && shop.coords) {
                    map.setView([shop.coords.latitude, shop.coords.longitude], 16);
                }
            };
        });
    }

    async function addShop() {
        if (!currentUserId) {
            showModal("You must be signed in to add a shop.");
            return;
        }

        const name = document.getElementById('shop-name').value.trim();
        const address = document.getElementById('shop-address').value.trim();
        const lat = parseFloat(document.getElementById('shop-lat').value);
        const lng = parseFloat(document.getElementById('shop-lng').value);
        const phone = document.getElementById('shop-phone').value.trim();
        const website = document.getElementById('shop-website').value.trim();
        const instagram = document.getElementById('shop-instagram').value.trim().replace('@', '');
        const hours = document.getElementById('shop-hours').value.trim();

        if (!name || !address || isNaN(lat) || isNaN(lng)) {
            showModal("Please fill out all required fields (Name, Address, Latitude, Longitude).");
            return;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90) {
            showModal("Latitude must be between -90 and 90 degrees.");
            return;
        }
        if (lng < -180 || lng > 180) {
            showModal("Longitude must be between -180 and 180 degrees.");
            return;
        }

        try {
            const shopData = {
                name,
                address,
                coords: {
                    latitude: lat,
                    longitude: lng
                },
                phone: phone || null,
                website: website || null,
                instagram: instagram || null,
                hours: hours || null,
                addedBy: currentUserId,
                verified: false,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'shops'), shopData);
            showModal("Shop added successfully!");
            
            // Clear form
            document.getElementById('add-shop-form').reset();
            
            // Refresh shops list
            renderShopsList();
            
            // Enable shops on map
            showShops = true;
            if (shopsToggle) shopsToggle.checked = true;
            renderShopMarkers();

        } catch (error) {
            console.error("Error adding shop:", error);
            showModal("Failed to add shop. Please try again.");
        }
    }

    async function openCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return showModal("Camera not supported on your browser.");
        if (!cameraModal || !cameraPreview || !recordBtn || !stopRecordBtn || !saveVideoBtn) {
            return showModal("Camera UI not available.");
        }
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
            cameraModal.style.display = "block";
            cameraPreview.srcObject = videoStream;
            recordBtn.style.display = 'inline-block';
            stopRecordBtn.style.display = 'none';
            saveVideoBtn.style.display = 'none';
        } catch (err) { console.error("Camera Error:", err); showModal("Could not access camera. Please check permissions."); }
    }

    if (recordBtn) {
        recordBtn.onclick = () => {
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(videoStream);
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                if (cameraPreview) {
                    cameraPreview.srcObject = null;
                    cameraPreview.src = URL.createObjectURL(videoBlob);
                }
                if (saveVideoBtn) saveVideoBtn.style.display = 'inline-block';
            };
            mediaRecorder.start();
            recordBtn.style.display = 'none';
            if (stopRecordBtn) stopRecordBtn.style.display = 'inline-block';
        };
    }

    if (stopRecordBtn) {
        stopRecordBtn.onclick = () => { mediaRecorder.stop(); stopRecordBtn.style.display = 'none'; };
    }
    
    if (saveVideoBtn) {
        saveVideoBtn.onclick = async () => {
        showModal("Uploading video...");
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const videoFileName = `${currentUserId}_${Date.now()}.webm`;
        const storageRef = ref(storage, `skate_spots_videos/${videoFileName}`);
        try {
            const snapshot = await uploadBytes(storageRef, videoBlob);
            recordedVideoUrl = await getDownloadURL(snapshot.ref);
            document.getElementById('videoStatus').innerHTML = `<p>✅ Video attached!</p>`;
            closeCamera();
            showModal("Video uploaded successfully!");
        } catch (error) {
            console.error("Upload failed", error);
            showModal("Video upload failed. Please try again. (Note: Storage setup may be incomplete).");
        }
        };
    }

    function closeCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        if (cameraModal) cameraModal.style.display = "none";
        if (cameraPreview) {
            cameraPreview.srcObject = null;
            cameraPreview.src = '';
        }
    }

    async function renderChallenges() {
        content.innerHTML = `
            <h3>All Challenges</h3>
            <p>Complete challenges from skate spots to earn XP!</p>
            <div id="allChallengesList" style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                <p>Loading challenges...</p>
            </div>
        `;

        const challengesList = document.getElementById('allChallengesList');
        if (!challengesList) return;

        try {
            // Get all challenges from all spots
            const allChallenges = [];

            for (const spot of skateSpots) {
                const challengesSnapshot = await getDocs(
                    collection(db, `/artifacts/${appId}/public/data/skate_spots/${spot.id}/challenges`)
                );

                challengesSnapshot.forEach(doc => {
                    const challenge = doc.data();
                    allChallenges.push({
                        id: doc.id,
                        spotId: spot.id,
                        spotName: spot.name,
                        ...challenge
                    });
                });
            }

            if (allChallenges.length === 0) {
                challengesList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No challenges available yet. Add spots with challenges to get started!</p>';
                return;
            }

            // Filter out challenges already completed by current user
            const pendingChallenges = allChallenges.filter(c =>
                !c.completedBy || !c.completedBy.includes(currentUserId)
            );

            if (pendingChallenges.length === 0) {
                challengesList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">You\'ve completed all available challenges! Great job!</p>';
                return;
            }

            // Render challenges
            challengesList.innerHTML = pendingChallenges.map(challenge => {
                const xpReward = challenge.xpReward || 50;
                return `
                    <div style="background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0; color: #333;">${challenge.text || 'Challenge'}</h4>
                                <p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${challenge.spotName}</p>
                                <p style="margin: 5px 0; color: #d2673d; font-weight: bold;">+${xpReward} XP</p>
                            </div>
                            <button
                                class="complete-challenge-btn"
                                data-spot-id="${challenge.spotId}"
                                data-challenge-id="${challenge.id}"
                                data-xp="${xpReward}"
                                style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;"
                                onmouseover="this.style.background='#45a049'"
                                onmouseout="this.style.background='#4CAF50'"
                            >
                                Complete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners to complete buttons
            document.querySelectorAll('.complete-challenge-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const button = e.target;
                    const spotId = button.dataset.spotId;
                    const challengeId = button.dataset.challengeId;
                    const xpReward = parseInt(button.dataset.xp);

                    button.disabled = true;
                    button.textContent = 'Completing...';

                    try {
                        // Update challenge with current user as completer
                        const challengeRef = doc(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges/${challengeId}`);
                        const challengeDoc = await getDoc(challengeRef);
                        const challengeData = challengeDoc.data();

                        const completedBy = [...(challengeData.completedBy || []), currentUserId];
                        await updateDoc(challengeRef, { completedBy });

                        // Update user profile with XP
                        const profilePath = `/artifacts/${appId}/users/${currentUserId}/profile/data`;
                        const currentXP = userProfile.xp || 0;
                        const completedChallenges = userProfile.challengesCompleted || [];

                        await updateDoc(doc(db, profilePath), {
                            xp: currentXP + xpReward,
                            challengesCompleted: [...completedChallenges, challengeId]
                        });

                        showModal(`Challenge completed! You earned ${xpReward} XP!`);

                        // Reload challenges view
                        renderChallenges();
                    } catch (error) {
                        console.error('Error completing challenge:', error);
                        showModal('Failed to complete challenge. Please try again.');
                        button.disabled = false;
                        button.textContent = 'Complete';
                    }
                };
            });

        } catch (error) {
            console.error('Error loading challenges:', error);
            challengesList.innerHTML = '<p style="color: #f44336; text-align: center; padding: 20px;">Error loading challenges. Please try again.</p>';
        }
    }

    function renderProfile() {
        // Calculate trick stats
        const trickProgress = userProfile.trickProgress || {};
        const learningCount = Object.values(trickProgress).filter(s => s === 'learning').length;
        const landedCount = Object.values(trickProgress).filter(s => s === 'landed').length;
        const masteredCount = Object.values(trickProgress).filter(s => s === 'mastered').length;

        content.innerHTML = `
            <h3>My Profile</h3>
            <p><strong>Username:</strong> ${userProfile.username || 'Anonymous'}</p>
            ${userProfile.crewTag ? `<p><strong>Crew:</strong> <span style="background:#667eea;color:white;padding:0.2rem 0.5rem;border-radius:4px;font-weight:bold;">[${userProfile.crewTag}]</span></p>` : ''}
            <p><strong>XP:</strong> ${userProfile.xp || 0}</p>
            <p><strong>Spots Added:</strong> ${userProfile.spotsAdded || 0}</p>

            <!-- Session Tracker -->
            <div style="margin-top:2rem;padding:1.5rem;background:linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 50%, #2BFF88 100%);border-radius:12px;color:white;">
                <h3 style="margin-top:0;">📊 Session Tracker</h3>
                ${!userProfile.activeSession ? `
                    <p>Track your skating sessions!</p>
                    <button id="start-session-btn" style="padding:0.8rem 1.5rem;background:white;color:#333;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:1rem;">
                        🎬 Start Session
                    </button>
                ` : `
                    <div id="active-session-display">
                        <p style="font-size:1.2rem;font-weight:bold;">⏱️ Session in Progress</p>
                        <p>Started: ${new Date(userProfile.activeSession.startTime?.toDate ? userProfile.activeSession.startTime.toDate() : userProfile.activeSession.startTime).toLocaleTimeString()}</p>
                        <div id="session-timer" style="font-size:2rem;font-weight:bold;margin:1rem 0;">00:00:00</div>
                        <button id="end-session-btn" style="padding:0.8rem 1.5rem;background:rgba(255,255,255,0.2);color:white;border:2px solid white;border-radius:8px;font-weight:bold;cursor:pointer;font-size:1rem;">
                            ⏹️ End Session
                        </button>
                    </div>
                `}
            </div>

            <!-- Session History -->
            <div style="margin-top:1.5rem;">
                <h3>📅 Session History</h3>
                <div id="session-history"></div>
            </div>

            <!-- Trick Stats Summary -->
            <div class="trick-stats-summary" style="margin: 1rem 0; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
                <h4 style="margin-top: 0;">🎯 Trick Progress</h4>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 100px; background: rgba(255,255,255,0.1); padding: 0.5rem; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${learningCount}</div>
                        <div style="font-size: 0.8rem;">Learning</div>
                    </div>
                    <div style="flex: 1; min-width: 100px; background: rgba(255,255,255,0.1); padding: 0.5rem; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${landedCount}</div>
                        <div style="font-size: 0.8rem;">Landed</div>
                    </div>
                    <div style="flex: 1; min-width: 100px; background: rgba(255,255,255,0.1); padding: 0.5rem; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${masteredCount}</div>
                        <div style="font-size: 0.8rem;">Mastered</div>
                    </div>
                </div>
            </div>

            <!-- Trick Tracker Section -->
            <div style="margin-top: 1.5rem;">
                <h3>📋 My Trick List</h3>
                <div style="margin-bottom: 1rem;">
                    <label for="trickLevelFilter">Filter by level:</label>
                    <select id="trickLevelFilter" style="padding: 0.5rem; border-radius: 5px;">
                        <option value="all">All Tricks</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                    </select>
                </div>
                <div id="tricksList"></div>
            </div>

            <button id="callOutBtn" style="margin-top: 1.5rem;">Call-Out User</button>
            <div id="callOutFormContainer" style="display:none;">
                <h4>Issue a Trick Call-Out</h4>
                <form id="callOutForm">
                    <label>Target Username:<br/><input type="text" id="targetUsername" required /></label>
                    <label>Trick:<br/><input type="text" id="trickName" required /></label>
                    <button type="submit">Send Call-Out</button>
                </form>
            </div>
            <h4>My Call-Outs</h4>
            <div id="callOutsList"></div>
        `;

        document.getElementById('callOutBtn').onclick = () => {
            document.getElementById('callOutFormContainer').style.display = 'block';
        };

        document.getElementById('callOutForm').onsubmit = async (e) => {
            e.preventDefault();
            const targetUsername = document.getElementById('targetUsername').value.trim();
            const trickName = document.getElementById('trickName').value.trim();
            if (!targetUsername || !trickName) return showModal("Please fill out all fields.");

            try {
                // Find user by username (requires a query)
                const usersRef = collection(db, `/artifacts/${appId}/users`);
                const q = query(usersRef, where("username", "==", targetUsername));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    return showModal("User not found.");
                }

                const targetUser = querySnapshot.docs[0];
                const targetId = targetUser.id;

                await addDoc(collection(db, `/artifacts/${appId}/trick_callouts`), {
                    challengerId: currentUserId,
                    challengerUsername: userProfile.username,
                    targetId: targetId,
                    targetUsername: targetUsername,
                    trick: trickName,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                showModal("Call-Out sent!");
                document.getElementById('callOutFormContainer').style.display = 'none';
            } catch (error) {
                console.error("Error sending call-out: ", error);
                showModal("Failed to send call-out.");
            }
        };

        // Load and display call-outs
        loadCallOuts();

        // Initialize trick tracker
        renderTricksList('all');

        // Add filter listener
        document.getElementById('trickLevelFilter').onchange = (e) => {
            renderTricksList(e.target.value);
        };

        // Session tracking handlers
        const startSessionBtn = document.getElementById('start-session-btn');
        const endSessionBtn = document.getElementById('end-session-btn');

        if (startSessionBtn) {
            startSessionBtn.onclick = () => startSession();
        }

        if (endSessionBtn) {
            endSessionBtn.onclick = () => endSession();
        }

        // Start session timer if active
        if (userProfile.activeSession) {
            updateSessionTimer();
        }

        // Load session history
        loadSessionHistory();
    }

    async function loadCallOuts() {
        const callOutsList = document.getElementById('callOutsList');
        if (!callOutsList) return;

        const sentQuery = query(collection(db, `/artifacts/${appId}/trick_callouts`), where("challengerId", "==", currentUserId));
        const receivedQuery = query(collection(db, `/artifacts/${appId}/trick_callouts`), where("targetId", "==", currentUserId));

        const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(sentQuery), getDocs(receivedQuery)]);

        let html = '<h4>Sent</h4><ul>';
        sentSnapshot.forEach(doc => {
            const callout = doc.data();
            html += `<li>vs ${callout.targetUsername} - ${callout.trick} (${callout.status})</li>`;
        });
        html += '</ul><h4>Received</h4><ul>';
        receivedSnapshot.forEach(doc => {
            const callout = doc.data();
            html += `<li>from ${callout.challengerUsername} - ${callout.trick} (${callout.status}) <button class="complete-callout" data-id="${doc.id}">Complete</button></li>`;
        });
        html += '</ul>';
        callOutsList.innerHTML = html;

        document.querySelectorAll('.complete-callout').forEach(button => {
            button.onclick = (e) => {
                const calloutId = e.target.dataset.id;
                // Here you would trigger the video recording flow
                showModal(`Completing call-out ${calloutId}... (video recording not implemented yet)`);
            };
        });
    }

    // Render tricks list based on filter
    function renderTricksList(level) {
        const tricksListDiv = document.getElementById('tricksList');
        if (!tricksListDiv || typeof window.getAllTricks !== 'function') return;

        const trickProgress = userProfile.trickProgress || {};
        let tricks = [];

        if (level === 'all') {
            tricks = window.getAllTricks();
        } else {
            tricks = window.getTricksByLevel(level);
        }

        // Group tricks by level for better organization
        const groupedTricks = {};
        tricks.forEach(trick => {
            const trickLevel = Object.keys(window.TRICKS_LIBRARY).find(key =>
                window.TRICKS_LIBRARY[key].some(t => t.id === trick.id)
            );
            if (!groupedTricks[trickLevel]) groupedTricks[trickLevel] = [];
            groupedTricks[trickLevel].push(trick);
        });

        let html = '';
        const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
        const levelEmojis = {
            'beginner': '🟢',
            'intermediate': '🟡',
            'advanced': '🟠',
            'expert': '🔴'
        };

        levelOrder.forEach(lvl => {
            if (!groupedTricks[lvl] || (level !== 'all' && level !== lvl)) return;

            html += `<div class="trick-level-group" style="margin-bottom: 1.5rem;">
                <h4 style="text-transform: capitalize; color: #FF5722;">${levelEmojis[lvl]} ${lvl} Tricks</h4>
                <div class="tricks-grid" style="display: grid; gap: 0.5rem;">`;

            groupedTricks[lvl].forEach(trick => {
                const status = trickProgress[trick.id] || 'not-started';
                const statusColors = {
                    'learning': '#FFA500',
                    'landed': '#4CAF50',
                    'mastered': '#9C27B0',
                    'not-started': '#757575'
                };
                const statusLabels = {
                    'learning': '📚 Learning',
                    'landed': '✅ Landed',
                    'mastered': '⭐ Mastered',
                    'not-started': '⚪ Not Started'
                };

                html += `
                <div class="trick-item" style="background: white; padding: 0.75rem; border-radius: 8px; border-left: 4px solid ${statusColors[status]}; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${trick.name}</strong>
                        <span style="margin-left: 0.5rem; font-size: 0.8rem; color: #666;">${trick.category}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <select class="trick-status-select" data-trick-id="${trick.id}" style="padding: 0.3rem; border-radius: 5px; font-size: 0.85rem; border: 1px solid #ddd; background: ${statusColors[status]}; color: white;">
                            <option value="not-started" ${status === 'not-started' ? 'selected' : ''}>Not Started</option>
                            <option value="learning" ${status === 'learning' ? 'selected' : ''}>Learning</option>
                            <option value="landed" ${status === 'landed' ? 'selected' : ''}>Landed</option>
                            <option value="mastered" ${status === 'mastered' ? 'selected' : ''}>Mastered</option>
                        </select>
                    </div>
                </div>`;
            });

            html += `</div></div>`;
        });

        tricksListDiv.innerHTML = html || '<p>No tricks found for this level.</p>';

        // Add event listeners for status changes
        document.querySelectorAll('.trick-status-select').forEach(select => {
            select.onchange = async (e) => {
                const trickId = e.target.dataset.trickId;
                const newStatus = e.target.value;
                await updateTrickStatus(trickId, newStatus);
            };
        });
    }

    // Update trick status in Firebase
    async function updateTrickStatus(trickId, status) {
        try {
            const profilePath = `/artifacts/${appId}/users/${currentUserId}/profile/data`;
            const newProgress = { ...userProfile.trickProgress } || {};

            if (status === 'not-started') {
                delete newProgress[trickId];
            } else {
                newProgress[trickId] = status;
            }

            await updateDoc(doc(db, profilePath), {
                trickProgress: newProgress
            });

            userProfile.trickProgress = newProgress;

            // Award XP for progression milestones
            if (status === 'landed') {
                await updateDoc(doc(db, profilePath), { xp: increment(50) });
                showModal(`🎉 Trick landed! +50 XP`);
            } else if (status === 'mastered') {
                await updateDoc(doc(db, profilePath), { xp: increment(100) });
                showModal(`⭐ Trick mastered! +100 XP`);
            }

            // Re-render to update stats
            if (profileBtn.classList.contains('active')) {
                renderProfile();
            }
        } catch (error) {
            console.error("Error updating trick status:", error);
            showModal("Failed to update trick status. Please try again.");
        }
    }

    // ===== SESSION TRACKING SYSTEM =====

    let sessionTimerInterval = null;

    // Start a new session
    async function startSession() {
        try {
            const sessionData = {
                startTime: serverTimestamp(),
                spotsVisited: [],
                tricksAttempted: 0,
                tricksLanded: 0
            };

            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                activeSession: sessionData
            });

            userProfile.activeSession = { ...sessionData, startTime: new Date() };

            showModal("Session started! Go shred! 🛹");
            renderProfile();
        } catch (error) {
            console.error("Error starting session:", error);
            showModal("Failed to start session. Please try again.");
        }
    }

    // End current session
    async function endSession() {
        if (!userProfile.activeSession) return;

        try {
            const endTime = new Date();
            const startTime = userProfile.activeSession.startTime?.toDate ? userProfile.activeSession.startTime.toDate() : new Date(userProfile.activeSession.startTime);
            const duration = Math.floor((endTime - startTime) / 1000); // in seconds

            const sessionRecord = {
                startTime: userProfile.activeSession.startTime,
                endTime: serverTimestamp(),
                duration: duration,
                spotsVisited: userProfile.activeSession.spotsVisited || [],
                tricksAttempted: userProfile.activeSession.tricksAttempted || 0,
                tricksLanded: userProfile.activeSession.tricksLanded || 0,
                userId: currentUserId
            };

            // Save to sessions collection
            await addDoc(collection(db, `/artifacts/${appId}/users/${currentUserId}/sessions`), sessionRecord);

            // Clear active session
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                activeSession: null
            });

            // Award XP for session
            const sessionXP = Math.min(Math.floor(duration / 60) * 5, 200); // 5 XP per minute, max 200
            if (sessionXP > 0) {
                await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                    xp: increment(sessionXP)
                });
            }

            userProfile.activeSession = null;

            if (sessionTimerInterval) {
                clearInterval(sessionTimerInterval);
                sessionTimerInterval = null;
            }

            const durationMin = Math.floor(duration / 60);
            showModal(`Session ended! Duration: ${durationMin} min. +${sessionXP} XP 🎉`);
            renderProfile();
        } catch (error) {
            console.error("Error ending session:", error);
            showModal("Failed to end session. Please try again.");
        }
    }

    // Update session timer display
    function updateSessionTimer() {
        const timerElement = document.getElementById('session-timer');
        if (!timerElement || !userProfile.activeSession) return;

        const updateTime = () => {
            const now = new Date();
            const startTime = userProfile.activeSession.startTime?.toDate ? userProfile.activeSession.startTime.toDate() : new Date(userProfile.activeSession.startTime);
            const diff = Math.floor((now - startTime) / 1000);

            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;

            timerElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        updateTime();
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        sessionTimerInterval = setInterval(updateTime, 1000);
    }

    // Load session history
    async function loadSessionHistory() {
        const historyDiv = document.getElementById('session-history');
        if (!historyDiv) return;

        try {
            const sessionsQuery = query(
                collection(db, `/artifacts/${appId}/users/${currentUserId}/sessions`),
                orderBy('endTime', 'desc'),
                limit(10)
            );
            const sessionsSnapshot = await getDocs(sessionsQuery);

            if (sessionsSnapshot.empty) {
                historyDiv.innerHTML = '<p style="color:#666;">No sessions recorded yet. Start your first session!</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:0.8rem;">';
            sessionsSnapshot.forEach(doc => {
                const session = doc.data();
                const duration = session.duration || 0;
                const durationMin = Math.floor(duration / 60);
                const durationSec = duration % 60;
                const endDate = session.endTime?.toDate ? session.endTime.toDate() : new Date();

                html += `
                    <div style="padding:1rem;background:#f5f5f5;border-radius:8px;border-left:4px solid #2BD2FF;">
                        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
                            <strong>${endDate.toLocaleDateString()}</strong>
                            <span style="color:#666;font-size:0.9rem;">${endDate.toLocaleTimeString()}</span>
                        </div>
                        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.9rem;color:#555;">
                            <span>⏱️ ${durationMin}m ${durationSec}s</span>
                            <span>📍 ${session.spotsVisited?.length || 0} spots</span>
                            <span>🎯 ${session.tricksLanded || 0}/${session.tricksAttempted || 0} tricks</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            historyDiv.innerHTML = html;
        } catch (error) {
            console.error("Error loading session history:", error);
            historyDiv.innerHTML = '<p style="color:#999;">Failed to load session history.</p>';
        }
    }

    // ===== CREW/TEAM SYSTEM =====

    let userCrew = null;
    let allCrews = [];

    // Render crews panel
    function renderCrewsPanel() {
        content.innerHTML = `
            <div style="padding:1.5rem;">
                <h2 style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">🤝 Skate Crews</h2>
                <p>Join or create a crew to compete together!</p>

                ${userCrew ? `
                    <div id="my-crew-section" style="margin:1.5rem 0;padding:1.5rem;background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%);border-radius:12px;color:white;">
                        <h3 style="margin-top:0;">👥 My Crew</h3>
                        <div id="my-crew-details">Loading...</div>
                        <button id="leave-crew-btn" style="margin-top:1rem;padding:0.6rem 1rem;background:rgba(255,255,255,0.2);color:white;border:1px solid white;border-radius:8px;cursor:pointer;">
                            Leave Crew
                        </button>
                    </div>
                ` : `
                    <div style="margin:1.5rem 0;padding:1.5rem;background:#f0f0f0;border-radius:12px;">
                        <h3>🆕 Create a Crew</h3>
                        <form id="create-crew-form" style="display:flex;flex-direction:column;gap:0.8rem;margin-top:1rem;">
                            <label>
                                Crew Name *
                                <input type="text" id="crew-name" required placeholder="e.g., Street Kings" maxlength="30" />
                            </label>
                            <label>
                                Crew Tag (2-5 letters) *
                                <input type="text" id="crew-tag" required placeholder="e.g., SK8" maxlength="5" style="text-transform:uppercase;" />
                            </label>
                            <label>
                                Crew Bio
                                <textarea id="crew-bio" placeholder="Describe your crew..." rows="3" maxlength="200"></textarea>
                            </label>
                            <button type="submit" style="padding:0.8rem;background:#667eea;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
                                Create Crew
                            </button>
                        </form>
                    </div>
                `}

                <hr style="margin:2rem 0;" />

                <h3>🌐 All Crews</h3>
                <div id="crews-list"></div>

                <hr style="margin:2rem 0;" />

                <h3>🏆 Crew Leaderboard</h3>
                <div id="crew-leaderboard"></div>
            </div>
        `;

        // Load crews data
        loadCrews();

        // Setup create crew form if user doesn't have a crew
        if (!userCrew) {
            const createCrewForm = document.getElementById('create-crew-form');
            if (createCrewForm) {
                createCrewForm.onsubmit = async (e) => {
                    e.preventDefault();
                    await createCrew();
                };
                // Force uppercase for tag
                const tagInput = document.getElementById('crew-tag');
                if (tagInput) {
                    tagInput.oninput = (e) => {
                        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    };
                }
            }
        } else {
            // Setup leave crew button
            const leaveCrewBtn = document.getElementById('leave-crew-btn');
            if (leaveCrewBtn) {
                leaveCrewBtn.onclick = () => leaveCrew();
            }
            // Load user's crew details
            loadMyCrew();
        }
    }

    // Create a new crew
    async function createCrew() {
        const name = document.getElementById('crew-name').value.trim();
        const tag = document.getElementById('crew-tag').value.trim().toUpperCase();
        const bio = document.getElementById('crew-bio').value.trim();

        if (!name || !tag) {
            showModal("Please provide crew name and tag.");
            return;
        }

        if (tag.length < 2 || tag.length > 5) {
            showModal("Crew tag must be 2-5 characters.");
            return;
        }

        try {
            // Check if tag already exists
            const tagQuery = query(collection(db, `/artifacts/${appId}/crews`), where("tag", "==", tag));
            const tagSnapshot = await getDocs(tagQuery);

            if (!tagSnapshot.empty) {
                showModal("This crew tag is already taken. Choose another one.");
                return;
            }

            const crewData = {
                name,
                tag,
                bio: bio || '',
                founderId: currentUserId,
                founderName: userProfile.username || 'Anonymous',
                members: [currentUserId],
                memberNames: [userProfile.username || 'Anonymous'],
                totalXP: userProfile.xp || 0,
                challengesCompleted: 0,
                spotsAdded: userProfile.spotsAdded || 0,
                createdAt: serverTimestamp()
            };

            const crewRef = await addDoc(collection(db, `/artifacts/${appId}/crews`), crewData);

            // Update user profile with crew ID
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                crewId: crewRef.id,
                crewTag: tag
            });

            userProfile.crewId = crewRef.id;
            userProfile.crewTag = tag;
            userCrew = { id: crewRef.id, ...crewData };

            showModal(`Crew "${name}" created successfully!`);
            renderCrewsPanel();
        } catch (error) {
            console.error("Error creating crew:", error);
            showModal("Failed to create crew. Please try again.");
        }
    }

    // Join an existing crew
    async function joinCrew(crewId, crewTag) {
        if (userCrew) {
            showModal("You must leave your current crew before joining another.");
            return;
        }

        try {
            const crewRef = doc(db, `/artifacts/${appId}/crews/${crewId}`);

            // Add user to crew members
            await updateDoc(crewRef, {
                members: [...(userCrew?.members || []), currentUserId],
                memberNames: [...(userCrew?.memberNames || []), userProfile.username || 'Anonymous'],
                totalXP: increment(userProfile.xp || 0),
                spotsAdded: increment(userProfile.spotsAdded || 0)
            });

            // Update user profile
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                crewId: crewId,
                crewTag: crewTag
            });

            userProfile.crewId = crewId;
            userProfile.crewTag = crewTag;

            showModal(`You've joined the crew!`);
            renderCrewsPanel();
        } catch (error) {
            console.error("Error joining crew:", error);
            showModal("Failed to join crew. Please try again.");
        }
    }

    // Leave current crew
    async function leaveCrew() {
        if (!userCrew) return;

        const confirmed = confirm(`Are you sure you want to leave "${userCrew.name}"?`);
        if (!confirmed) return;

        try {
            const crewRef = doc(db, `/artifacts/${appId}/crews/${userCrew.id}`);

            // Remove user from crew
            const newMembers = userCrew.members.filter(id => id !== currentUserId);
            const newMemberNames = userCrew.memberNames.filter(name => name !== (userProfile.username || 'Anonymous'));

            if (newMembers.length === 0) {
                // Delete crew if no members left
                await deleteDoc(crewRef);
                showModal("Crew dissolved (no members remaining).");
            } else {
                await updateDoc(crewRef, {
                    members: newMembers,
                    memberNames: newMemberNames,
                    totalXP: increment(-(userProfile.xp || 0)),
                    spotsAdded: increment(-(userProfile.spotsAdded || 0))
                });
                showModal("You've left the crew.");
            }

            // Update user profile
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                crewId: null,
                crewTag: null
            });

            userProfile.crewId = null;
            userProfile.crewTag = null;
            userCrew = null;

            renderCrewsPanel();
        } catch (error) {
            console.error("Error leaving crew:", error);
            showModal("Failed to leave crew. Please try again.");
        }
    }

    // Load all crews
    async function loadCrews() {
        try {
            const crewsSnapshot = await getDocs(collection(db, `/artifacts/${appId}/crews`));
            allCrews = [];
            crewsSnapshot.forEach(doc => {
                allCrews.push({ id: doc.id, ...doc.data() });
            });

            // Check if user has a crew
            if (userProfile.crewId) {
                userCrew = allCrews.find(c => c.id === userProfile.crewId);
            }

            renderCrewsList();
            renderCrewLeaderboard();
        } catch (error) {
            console.error("Error loading crews:", error);
        }
    }

    // Load user's crew details
    async function loadMyCrew() {
        if (!userCrew) return;

        const myCrewDetails = document.getElementById('my-crew-details');
        if (!myCrewDetails) return;

        myCrewDetails.innerHTML = `
            <h4 style="margin:0.5rem 0;font-size:1.5rem;">[${userCrew.tag}] ${userCrew.name}</h4>
            ${userCrew.bio ? `<p style="margin:0.5rem 0;opacity:0.9;">${escapeHtml(userCrew.bio)}</p>` : ''}
            <div style="margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:1rem;">
                <div style="background:rgba(255,255,255,0.2);padding:0.8rem;border-radius:8px;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:bold;">${userCrew.members?.length || 0}</div>
                    <div style="font-size:0.8rem;">Members</div>
                </div>
                <div style="background:rgba(255,255,255,0.2);padding:0.8rem;border-radius:8px;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:bold;">${userCrew.totalXP || 0}</div>
                    <div style="font-size:0.8rem;">Total XP</div>
                </div>
                <div style="background:rgba(255,255,255,0.2);padding:0.8rem;border-radius:8px;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:bold;">${userCrew.spotsAdded || 0}</div>
                    <div style="font-size:0.8rem;">Spots</div>
                </div>
            </div>
            <div style="margin-top:1rem;">
                <strong>Members:</strong><br/>
                ${userCrew.memberNames?.join(', ') || 'None'}
            </div>
        `;
    }

    // Render crews list
    function renderCrewsList() {
        const crewsList = document.getElementById('crews-list');
        if (!crewsList) return;

        if (allCrews.length === 0) {
            crewsList.innerHTML = '<p style="color:#666;">No crews yet. Be the first to create one!</p>';
            return;
        }

        crewsList.innerHTML = allCrews.map(crew => `
            <div style="padding:1rem;margin-bottom:1rem;border:2px solid #667eea;border-radius:10px;background:white;">
                <h4 style="margin:0 0 0.5rem 0;color:#667eea;"><span style="background:#667eea;color:white;padding:0.2rem 0.5rem;border-radius:4px;margin-right:0.5rem;">${escapeHtml(crew.tag)}</span>${escapeHtml(crew.name)}</h4>
                ${crew.bio ? `<p style="margin:0.5rem 0;color:#666;font-size:0.9rem;">${escapeHtml(crew.bio)}</p>` : ''}
                <div style="margin-top:0.8rem;display:flex;gap:1rem;flex-wrap:wrap;font-size:0.9rem;color:#555;">
                    <span>👥 ${crew.members?.length || 0} members</span>
                    <span>⭐ ${crew.totalXP || 0} XP</span>
                    <span>📍 ${crew.spotsAdded || 0} spots</span>
                </div>
                ${!userCrew && crew.id !== userProfile.crewId ? `
                    <button class="join-crew-btn" data-crew-id="${crew.id}" data-crew-tag="${crew.tag}"
                            style="margin-top:0.8rem;padding:0.5rem 1rem;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">
                        Join Crew
                    </button>
                ` : ''}
                ${crew.id === userProfile.crewId ? '<span style="color:#4CAF50;font-weight:bold;">✓ Your Crew</span>' : ''}
            </div>
        `).join('');

        // Add event listeners to join buttons
        document.querySelectorAll('.join-crew-btn').forEach(btn => {
            btn.onclick = () => {
                const crewId = btn.dataset.crewId;
                const crewTag = btn.dataset.crewTag;
                joinCrew(crewId, crewTag);
            };
        });
    }

    // Render crew leaderboard
    function renderCrewLeaderboard() {
        const leaderboard = document.getElementById('crew-leaderboard');
        if (!leaderboard) return;

        const sortedCrews = [...allCrews].sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));

        if (sortedCrews.length === 0) {
            leaderboard.innerHTML = '<p style="color:#666;">No crews to display yet.</p>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];

        leaderboard.innerHTML = `
            <div style="background:#f5f5f5;border-radius:10px;padding:1rem;">
                ${sortedCrews.slice(0, 10).map((crew, index) => `
                    <div style="padding:0.8rem;margin-bottom:0.5rem;background:white;border-radius:8px;display:flex;justify-content:space-between;align-items:center;${crew.id === userProfile.crewId ? 'border:2px solid #4CAF50;' : ''}">
                        <div style="display:flex;align-items:center;gap:0.8rem;">
                            <span style="font-size:1.5rem;min-width:30px;">${medals[index] || `#${index + 1}`}</span>
                            <div>
                                <strong>[${escapeHtml(crew.tag)}] ${escapeHtml(crew.name)}</strong>
                                <div style="font-size:0.8rem;color:#666;">
                                    ${crew.members?.length || 0} members
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.2rem;font-weight:bold;color:#667eea;">${crew.totalXP || 0} XP</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ===== EVENTS & MEETUPS SYSTEM =====

    let allEvents = [];

    // Render events panel
    function renderEventsPanel() {
        content.innerHTML = `
            <div style="padding:1.5rem;">
                <h2 style="background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">📅 Events & Meetups</h2>
                <p>Join or create skateboarding events in your area!</p>

                <div style="margin:2rem 0;padding:1.5rem;background:#f0f0f0;border-radius:12px;">
                    <h3>🎉 Create an Event</h3>
                    <form id="create-event-form" style="display:flex;flex-direction:column;gap:0.8rem;margin-top:1rem;">
                        <label>
                            Event Name *
                            <input type="text" id="event-name" required placeholder="e.g., Downtown Skate Jam" maxlength="50" />
                        </label>
                        <label>
                            Date & Time *
                            <input type="datetime-local" id="event-datetime" required />
                        </label>
                        <label>
                            Location *
                            <input type="text" id="event-location" required placeholder="Venice Skatepark, CA" />
                        </label>
                        <label>
                            Description
                            <textarea id="event-description" placeholder="What's happening at this event..." rows="3" maxlength="300"></textarea>
                        </label>
                        <label>
                            Event Type
                            <select id="event-type">
                                <option value="jam">Skate Jam</option>
                                <option value="contest">Contest</option>
                                <option value="meetup">Casual Meetup</option>
                                <option value="lesson">Lesson/Workshop</option>
                                <option value="demo">Demo</option>
                            </select>
                        </label>
                        <button type="submit" style="padding:0.8rem;background:#f5576c;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
                            Create Event
                        </button>
                    </form>
                </div>

                <hr style="margin:2rem 0;" />

                <h3>🌟 Upcoming Events</h3>
                <div id="events-list"></div>
            </div>
        `;

        // Setup form
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.onsubmit = async (e) => {
                e.preventDefault();
                await createEvent();
            };
        }

        // Load events
        loadEvents();
    }

    // Create a new event
    async function createEvent() {
        const name = document.getElementById('event-name').value.trim();
        const datetime = document.getElementById('event-datetime').value;
        const location = document.getElementById('event-location').value.trim();
        const description = document.getElementById('event-description').value.trim();
        const type = document.getElementById('event-type').value;

        if (!name || !datetime || !location) {
            showModal("Please fill out all required fields.");
            return;
        }

        try {
            const eventData = {
                name,
                datetime: new Date(datetime),
                location,
                description: description || '',
                type,
                organizerId: currentUserId,
                organizerName: userProfile.username || 'Anonymous',
                attendees: [currentUserId],
                attendeeNames: [userProfile.username || 'Anonymous'],
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, `/artifacts/${appId}/events`), eventData);

            showModal("Event created successfully! 🎉");
            document.getElementById('create-event-form').reset();
            loadEvents();
        } catch (error) {
            console.error("Error creating event:", error);
            showModal("Failed to create event. Please try again.");
        }
    }

    // Load all events
    async function loadEvents() {
        try {
            const now = new Date();
            const eventsSnapshot = await getDocs(collection(db, `/artifacts/${appId}/events`));

            allEvents = [];
            eventsSnapshot.forEach(doc => {
                const event = { id: doc.id, ...doc.data() };
                // Convert datetime to Date if it's a timestamp
                if (event.datetime?.toDate) {
                    event.datetime = event.datetime.toDate();
                } else if (typeof event.datetime === 'string') {
                    event.datetime = new Date(event.datetime);
                }
                allEvents.push(event);
            });

            // Filter to upcoming events and sort by date
            allEvents = allEvents
                .filter(e => e.datetime > now)
                .sort((a, b) => a.datetime - b.datetime);

            renderEventsList();
        } catch (error) {
            console.error("Error loading events:", error);
        }
    }

    // Render events list
    function renderEventsList() {
        const eventsList = document.getElementById('events-list');
        if (!eventsList) return;

        if (allEvents.length === 0) {
            eventsList.innerHTML = '<p style="color:#666;">No upcoming events. Create one!</p>';
            return;
        }

        const eventTypeEmojis = {
            'jam': '🎸',
            'contest': '🏆',
            'meetup': '🤝',
            'lesson': '📚',
            'demo': '🎬'
        };

        eventsList.innerHTML = allEvents.map(event => {
            const isAttending = event.attendees?.includes(currentUserId);
            const eventDate = event.datetime;
            const dateStr = eventDate.toLocaleDateString();
            const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div style="padding:1.5rem;margin-bottom:1rem;border:2px solid #f5576c;border-radius:12px;background:${isAttending ? 'linear-gradient(135deg, #f093fb10 0%, #f5576c10 100%)' : 'white'};">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.8rem;">
                        <h4 style="margin:0;color:#f5576c;">${eventTypeEmojis[event.type] || '📅'} ${escapeHtml(event.name)}</h4>
                        <span style="background:#f5576c;color:white;padding:0.2rem 0.6rem;border-radius:4px;font-size:0.8rem;text-transform:uppercase;">${event.type}</span>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.5rem;margin:0.8rem 0;color:#555;font-size:0.95rem;">
                        <div><strong>📅 When:</strong> ${dateStr} at ${timeStr}</div>
                        <div><strong>📍 Where:</strong> ${escapeHtml(event.location)}</div>
                        <div><strong>👤 Organized by:</strong> ${escapeHtml(event.organizerName)}</div>
                        <div><strong>👥 Attendees:</strong> ${event.attendees?.length || 0}</div>
                    </div>

                    ${event.description ? `<p style="margin:0.8rem 0;color:#666;font-size:0.9rem;">${escapeHtml(event.description)}</p>` : ''}

                    <div style="margin-top:1rem;">
                        ${isAttending ? `
                            <button class="leave-event-btn" data-event-id="${event.id}"
                                    style="padding:0.6rem 1.2rem;background:#ccc;color:#333;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">
                                Cancel RSVP
                            </button>
                            <span style="margin-left:1rem;color:#4CAF50;font-weight:bold;">✓ You're attending!</span>
                        ` : `
                            <button class="join-event-btn" data-event-id="${event.id}"
                                    style="padding:0.6rem 1.2rem;background:#f5576c;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">
                                RSVP / Join Event
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        document.querySelectorAll('.join-event-btn').forEach(btn => {
            btn.onclick = () => joinEvent(btn.dataset.eventId);
        });

        document.querySelectorAll('.leave-event-btn').forEach(btn => {
            btn.onclick = () => leaveEvent(btn.dataset.eventId);
        });
    }

    // Join an event
    async function joinEvent(eventId) {
        try {
            const event = allEvents.find(e => e.id === eventId);
            if (!event) return;

            const eventRef = doc(db, `/artifacts/${appId}/events/${eventId}`);

            await updateDoc(eventRef, {
                attendees: [...(event.attendees || []), currentUserId],
                attendeeNames: [...(event.attendeeNames || []), userProfile.username || 'Anonymous']
            });

            showModal("You're attending this event! 🎉");
            loadEvents();
        } catch (error) {
            console.error("Error joining event:", error);
            showModal("Failed to join event. Please try again.");
        }
    }

    // Leave an event
    async function leaveEvent(eventId) {
        try {
            const event = allEvents.find(e => e.id === eventId);
            if (!event) return;

            const eventRef = doc(db, `/artifacts/${appId}/events/${eventId}`);

            const newAttendees = event.attendees.filter(id => id !== currentUserId);
            const newAttendeeNames = event.attendeeNames.filter(name => name !== (userProfile.username || 'Anonymous'));

            await updateDoc(eventRef, {
                attendees: newAttendees,
                attendeeNames: newAttendeeNames
            });

            showModal("RSVP cancelled.");
            loadEvents();
        } catch (error) {
            console.error("Error leaving event:", error);
            showModal("Failed to cancel RSVP. Please try again.");
        }
    }
});
