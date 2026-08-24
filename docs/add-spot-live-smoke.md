# Add Spot live smoke

Use the deployed web app for these runtime-only checks after CI passes and the latest commit is deployed.

- Open `/add-spot` and confirm the route renders.
- Tap the map and confirm the pin and displayed coordinates move to the tapped location.
- Use browser location with permission allowed and confirm the pin moves to the real location.
- Deny browser location, confirm a useful error appears, then retry and allow permission.
- While authenticated, save a uniquely named test spot.
- Confirm the save succeeds only after the app reads the created spot back from Supabase.
- Reopen the saved spot from the map and confirm name and coordinates match.
