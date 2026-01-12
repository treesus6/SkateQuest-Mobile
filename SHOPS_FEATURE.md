# Skate Shops Feature

## Overview

The Skate Shops feature allows users to discover local skate shops near skating spots. Shops appear as green markers on the map with detailed information including address, phone, website, and hours.

## User Guide

### Viewing Shops

1. Click the **"Shops"** button in the navigation bar
2. Check the **"Show skate shops"** toggle to display shops on the map
3. Green circular markers with 🛒 icons represent skate shops
4. Click any shop marker to see detailed information

### Adding a Shop

1. Click the **"Shops"** button
2. Scroll down to the "Add a Skate Shop" form
3. Fill in the required fields:
   - **Shop Name** (required)
   - **Address** (required)
   - **Latitude** (required, -90 to 90)
   - **Longitude** (required, -180 to 180)
4. Optionally add:
   - Phone number
   - Website URL
   - Business hours
5. Click **"Add Shop"** to submit

### Browsing Shops List

- The "Nearby Shops" section shows all added shops
- Click **"View on Map"** to center the map on a specific shop
- Shops include contact information and hours if provided

## For Developers

### Data Structure

Shops are stored in the Firestore `shops` collection with this schema:

```javascript
{
  name: string,              // Shop name
  address: string,           // Full address
  coords: {
    latitude: number,        // -90 to 90
    longitude: number        // -180 to 180
  },
  phone: string | null,      // Optional phone number
  website: string | null,    // Optional website URL
  hours: string | null,      // Optional business hours
  addedBy: string,           // User ID who added the shop
  verified: boolean,         // Verification status
  createdAt: timestamp       // When shop was added
}
```

### Security

- All user input is HTML-escaped to prevent XSS
- Coordinate validation ensures valid lat/lng ranges
- Firestore rules allow authenticated users to add shops
- External links use `rel="noopener"` for security

### Sample Data

Sample shop data for Portland, OR is available in `sample-shops-data.json`. To import:

```bash
# Using Firebase CLI
firebase firestore:import sample-shops-data.json --collection shops
```

Or manually add through the Shops UI in the app.

### Customization

**Marker Icon**: Modify the shop icon in `app.js` at the `shopIcon` definition:

```javascript
const shopIcon = L.divIcon({
  className: 'shop-marker',
  html: '<div style="background:#4CAF50;...">🛒</div>',
  iconSize: [30, 30],
});
```

**Popup Style**: Customize popup appearance in the `popupContent` template string.

## FAQ

**Q: Can I edit or delete a shop after adding it?**  
A: Currently, shops can only be added. Edit/delete functionality can be added in a future update.

**Q: How do I verify a shop?**  
A: Shop verification is currently manual. Admin users can update the `verified` field in Firestore.

**Q: How do I get latitude/longitude for a shop?**  
A: Right-click on Google Maps at the shop location and select "What's here?" to see coordinates.

## Future Enhancements

- [ ] Edit/delete shop functionality
- [ ] Shop ratings and reviews
- [ ] Shop photos/images
- [ ] Integration with Google Places API
- [ ] Admin verification workflow
- [ ] Distance-based shop search
- [ ] Filter shops by type (local, chain, etc.)
