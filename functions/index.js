const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Cloud Function to securely complete a challenge and award XP
// Expects: POST with { challengeId: string }
// Requires authenticated caller (Firebase Auth token) and will verify the challenge exists
exports.completeChallenge = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Request has no authentication context.'
    );
  }
  const uid = context.auth.uid;
  const { challengeId } = data || {};
  if (!challengeId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing challengeId');
  }

  const challengeRef = db.collection('challenges').doc(challengeId);
  return db.runTransaction(async tx => {
    const snap = await tx.get(challengeRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found');
    }
    const c = snap.data();
    if (c.status === 'complete') {
      throw new functions.https.HttpsError('failed-precondition', 'Challenge already completed');
    }
    const xp = c.xp || 0;
    const userRef = db.collection('users').doc(uid);
    tx.update(userRef, {
      xp: admin.firestore.FieldValue.increment(xp),
      lastCompleted: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(challengeRef, {
      status: 'complete',
      completedBy: uid,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, xp };
  });
});

// Cloud Function to securely log Portal Dimension click with basic per-user rate limiting
// Expects: { location?: string }
exports.logPortalClick = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    // Require authentication to prevent anonymous spam; app signs in anonymously by default
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = context.auth.uid;
  const { location = 'Unknown' } = data || {};

  const clicksRef = db.collection('portalDimensionClicks');

  // Basic rate limiting: disallow clicks more than once every 10 seconds per user
  try {
    const recentQuery = await clicksRef
      .where('uid', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    if (!recentQuery.empty) {
      const last = recentQuery.docs[0].data().timestamp;
      const lastMillis = last.toMillis ? last.toMillis() : last._seconds * 1000;
      if (Date.now() - lastMillis < 10000) {
        // 10s
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many clicks; please wait a bit'
        );
      }
    }
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    // If the query fails, log and proceed
    console.warn('Rate-limit check failed', err);
  }

  try {
    await clicksRef.add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      location,
      uid,
      userAgent:
        (context.rawRequest &&
          context.rawRequest.headers &&
          context.rawRequest.headers['user-agent']) ||
        null,
      clickDate: new Date().toISOString().split('T')[0],
    });
    return { success: true };
  } catch (e) {
    console.error('logPortalClick error', e);
    throw new functions.https.HttpsError('internal', 'Failed to log click');
  }
});
