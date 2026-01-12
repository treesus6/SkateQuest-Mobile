# Portal Dimension Integration - Setup Guide

## 🎯 What This Does

Adds a clickable Portal Dimension logo at Newport Skatepark in Oregon that:

- ✅ Shows as a custom marker on the map
- ✅ Opens Portal Dimension's website when clicked
- ✅ Tracks every click (locally + Firebase)
- ✅ Provides real-time analytics dashboard

## 📦 Files Added

1. **portal-dimension.js** - Main integration script
2. **admin/portal-stats.html** - Analytics dashboard
3. **firestore.rules** - Updated with click tracking permissions

## 🚀 Quick Setup

### 1. Update Portal Dimension Logo

Replace the temporary logo with the actual Portal Dimension logo:

```bash
# Get the logo from Kevin and save it as:
# icons/portal-dimension-logo.png

# Or use a custom path and update portal-dimension.js line 9:
logoUrl: '/path/to/portal-dimension-logo.png',
```

### 2. Update Website URL

Edit `portal-dimension.js` line 7:

```javascript
website: 'https://portaldimension.com', // Update with actual URL
```

### 3. Verify Coordinates

The default coordinates are for Newport Skatepark, Oregon:

- Latitude: 44.6368
- Longitude: -124.0537

If needed, update lines 11-12 in `portal-dimension.js`.

### 4. Deploy Firebase Rules

```bash
cd /home/treevanderveer/SkateQuest-App
firebase deploy --only firestore:rules
```

### 5. Test Locally

The local server should still be running. Refresh the browser at http://localhost:8000

You should see:

- ✅ Portal Dimension logo appears at Newport Skatepark
- ✅ Logo has hover effect (scales up, glows)
- ✅ Clicking logo opens website
- ✅ Click notification appears
- ✅ Console shows click tracking

### 6. Check Stats

Open browser console (F12) and type:

```javascript
PortalDimensionSpot.getStats();
```

You should see:

```javascript
{
  totalClicks: X,
  lastClick: "timestamp",
  clicksByDay: {...},
  averageClicksPerDay: X.X
}
```

### 7. View Analytics Dashboard

Open: http://localhost:8000/admin/portal-stats.html

You'll see:

- 📊 Total clicks
- 📅 Today's clicks
- 📈 Average per day
- ⏰ Last click time
- 📊 Bar chart (last 7 days)
- 📋 Recent clicks list

## 🌐 Deploy to Production

```bash
cd /home/treevanderveer/SkateQuest-App

# Add all files
git add portal-dimension.js admin/portal-stats.html index.html firestore.rules

# Commit
git commit -m "Add Portal Dimension clickable logo with analytics

- Added Portal Dimension marker at Newport Skatepark
- Implemented click tracking (local + Firebase)
- Created analytics dashboard at /admin/portal-stats.html
- Updated Firestore rules for click tracking
- Logo opens Portal Dimension website on click"

# Push (triggers automatic deployment)
git push origin main
```

## 📊 Accessing Stats in Production

Once deployed:

### Console Stats:

1. Go to https://sk8.quest
2. Press F12 (open console)
3. Type: `PortalDimensionSpot.getStats()`

### Full Dashboard:

Visit: https://sk8.quest/admin/portal-stats.html

## 🎨 Customization Options

### Change Logo Size

Edit `portal-dimension.js` line 17:

```javascript
logoSize: [100, 100],  // Width, height in pixels
```

### Disable Click Tracking

Edit `portal-dimension.js` line 18:

```javascript
trackClicks: false,
```

### Change Popup Content

Edit lines 127-158 in `portal-dimension.js` to customize the popup that appears when clicking the marker.

### Change Hover Effects

Edit lines 174-197 in `portal-dimension.js` to customize hover animations.

## 🔍 Troubleshooting

### Logo Not Appearing?

1. Check console for errors
2. Verify map is loaded: `console.log(window.map)`
3. Check if script loaded: `console.log(window.PortalDimensionSpot)`
4. Manually initialize: `PortalDimensionSpot.init()`

### Logo Not Clickable?

1. Check that website URL is valid
2. Look for popup blocker warnings
3. Check console for click tracking errors

### Stats Not Saving?

1. Verify Firebase rules deployed: `firebase deploy --only firestore:rules`
2. Check Firebase console for `portalDimensionClicks` collection
3. Verify Firebase is initialized: `console.log(window.firebaseInstances)`

### Dashboard Not Loading?

1. Check Firebase config in `admin/portal-stats.html` (lines 170-176)
2. Verify collection name matches: `portalDimensionClicks`
3. Check browser console for errors

## 📈 Understanding the Data

### Local Storage

- Stores: total clicks, last click, clicks by day
- Persists across page refreshes
- User-specific (not shared)

### Firebase Storage

- Stores: every individual click with timestamp, location, user agent
- Shared across all users
- Real-time updates
- Queryable for analytics

### Click Record Structure

```javascript
{
  timestamp: Firestore timestamp,
  location: "Newport Skatepark",
  userAgent: "Mozilla/5.0...",
  referrer: "direct" or URL,
  clickDate: "2025-11-24"
}
```

## 🔐 Security

The Firestore rule allows:

- ✅ Anyone can READ click stats (public analytics)
- ✅ Anyone can CREATE click records (track clicks)
- ❌ Nobody can UPDATE or DELETE clicks (data integrity)

This prevents tampering while allowing legitimate tracking.

## 🛡️ Server setup: Deploy Cloud Function for secure logging

To prevent spam and allow server-side rate-limiting, we've added a Cloud Function `logPortalClick` in `functions/index.js`.

Deployment steps:

1. From the project root, install functions dependencies and deploy the function:

```bash
cd functions
npm install
firebase deploy --only functions:logPortalClick --project <your-project-id>
```

2. Optionally deploy all functions:

```bash
firebase deploy --only functions --project <your-project-id>
```

3. After deploying, make sure `index.html` includes the `functions` SDK and that `window.firebaseInstances` contains `functions` and `httpsCallable` (already supported in main index.html).

4. Ensure `firestore.rules` permits reads and restricts writes (client writes should be via auth or Cloud Function). You can tighten the rule further to `allow create: if false;` to force all writes through Cloud Functions.

If you'd like, I can add a sample CI/CD workflow to deploy this function automatically.

## 💡 Future Enhancements

Consider adding:

- Geographic distribution of clicks
- Time-of-day analysis
- Referrer tracking (where users came from)
- A/B testing different logo designs
- Custom events (hover duration, popup views)
- Integration with Google Analytics

## 📞 Support

If you need help:

1. Check console for errors
2. Verify all files are deployed
3. Test Firebase connection
4. Check the analytics dashboard

## ✅ Success Checklist

- [ ] Portal Dimension logo obtained from Kevin
- [ ] Logo file added to project
- [ ] Website URL updated in config
- [ ] Coordinates verified for Newport
- [ ] Firebase rules deployed
- [ ] Tested locally - logo shows
- [ ] Tested locally - click works
- [ ] Stats dashboard accessible
- [ ] Committed to Git
- [ ] Pushed to production
- [ ] Verified on live site (sk8.quest)
- [ ] Shared dashboard link with Kevin

---

## 🛹 That's It!

Portal Dimension now has a prominent, clickable presence on your skate map at Newport Skatepark. Every click is tracked and you can monitor performance in real-time. This creates value for your partner while giving you data to demonstrate impact. 🤙
