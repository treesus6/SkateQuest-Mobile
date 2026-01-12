# SkateQuest - Copilot Instructions

## Project Overview

SkateQuest is a Progressive Web App (PWA) that helps skateboarders discover, share, and track local skating spots. Users can join challenges, earn badges and XP, and connect with the skating community.

## Technology Stack

### Frontend

- **HTML/CSS/JavaScript**: Vanilla JavaScript (no framework) with modern ES6+ features
- **Leaflet.js**: Interactive mapping library for displaying skate spots
- **PWA**: Progressive Web App with service worker and manifest
- **Firebase SDK**: Client-side Firebase integration via CDN

### Backend

- **Firebase**: Backend-as-a-Service
  - Firestore: NoSQL database for spots, challenges, users, and leaderboards
  - Firebase Storage: Image and media storage
  - Firebase Authentication: User authentication
  - Firebase Functions: Serverless cloud functions (Node.js 18)
- **Netlify**: Static site hosting and serverless functions

### Build & Deployment

- **Netlify**: Primary hosting platform
- **Firebase Hosting**: Alternative/supplementary hosting
- **GitHub Actions**: CI/CD pipeline for automated deployment and monitoring

## Project Structure

```
SkateQuest-App/
├── .github/
│   ├── workflows/          # GitHub Actions CI/CD workflows
│   └── copilot-instructions.md
├── functions/              # Firebase Cloud Functions
│   ├── index.js           # Cloud Functions (completeChallenge, etc.)
│   └── package.json
├── netlify/
│   └── functions/         # Netlify serverless functions
├── pages/                 # Additional page components
├── scripts/               # Utility scripts
├── icons/                 # PWA icons and app images
├── index.html             # Main application entry point
├── main.js                # Core application logic
├── app.js                 # Additional app functionality
├── style.css              # Main stylesheet
├── pwa.js                 # PWA registration and service worker setup
├── service-worker.js      # Service worker for offline functionality
├── manifest.json          # PWA manifest
├── firebase.json          # Firebase project configuration
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage security rules
├── netlify.toml           # Netlify configuration
└── package.json           # Project dependencies (minimal - static site)
```

## Key Files and Their Purpose

- **index.html**: Main entry point with Firebase SDK loaded via CDN
- **main.js**: Core app logic including challenge system, spot/trick selection, API helpers
- **app.js**: Extended functionality for user features
- **service-worker.js**: Caches assets for offline functionality
- **firestore.rules**: Security rules for Firestore database access
- **storage.rules**: Security rules for Firebase Storage access
- **functions/index.js**: Cloud Functions for secure backend operations (e.g., `completeChallenge`)

## Firebase Integration

Firebase modules are loaded via CDN in `index.html` and exposed as `window.firebaseInstances`. This pattern avoids module resolution errors in browser JavaScript.

Example usage:

```javascript
const { db, storage, doc, getDocs } = window.firebaseInstances;
```

**Important**: Never use bare module specifiers (e.g., `import { ... } from 'firebase/firestore'`) in browser JavaScript files.

## Development Workflow

### Local Development

1. **Start local server**:

   ```bash
   npm run serve-local
   # or
   python3 -m http.server 8000
   ```

2. **Access the app**: Open `http://localhost:8000` in your browser

3. **Test Firebase**: Ensure Firebase project `skatequest-666` is properly configured in the console

### Testing

- **No automated tests**: This is a static site with minimal test infrastructure
- **Manual testing**: Test in browser with DevTools console open
- **Test PWA features**: Use Chrome DevTools > Application tab > Service Workers

### Linting

Basic linting is done via GitHub Actions:

```bash
npx eslint app.js
```

## Deployment

### Automatic Deployment (Recommended)

Push to `main` branch triggers automatic deployment via GitHub Actions:

1. Lints JavaScript files
2. Validates HTML and Firebase config
3. Deploys Firebase rules
4. Monitors site health

### Manual Deployment

**Firebase Rules**:

```bash
./deploy.sh
# or
firebase deploy --only firestore:rules,storage:rules --project skatequest-666
```

**Netlify**: Automatically deploys when connected to GitHub repository

## Coding Standards and Best Practices

### JavaScript

- Use modern ES6+ syntax (const/let, arrow functions, async/await)
- Avoid polluting global namespace - use closures and DOMContentLoaded
- Handle errors gracefully with try/catch blocks
- Use `console.debug` for debug logs, `console.error` for errors
- Never commit Firebase API keys or secrets (they're already exposed client-side safely)

### HTML/CSS

- Semantic HTML5 elements
- Mobile-first responsive design
- Use CSS custom properties for theming
- Maintain accessibility (ARIA labels, alt text, keyboard navigation)

### Firebase

- Always use security rules to protect data
- Use Firebase Authentication for user-specific operations
- Leverage Firestore transactions for atomic operations
- Use Cloud Functions for sensitive operations (e.g., awarding XP)

### API Integration

- Use the `apiFetch` helper in `main.js` for API calls
- Automatically attaches Firebase auth token to requests
- Gracefully handle network errors

## Common Tasks

### Adding a New Feature

1. Update relevant HTML in `index.html`
2. Add JavaScript logic in `main.js` or `app.js`
3. Update styles in `style.css`
4. Test locally with `npm run serve-local`
5. If backend logic needed, add Cloud Function in `functions/index.js`
6. Update Firestore/Storage rules if needed

### Adding a New Challenge Type

1. Define challenge structure in Firestore (see existing challenges collection)
2. Update UI in `index.html` challenge panel
3. Add handling logic in `main.js`
4. Update `completeChallenge` Cloud Function if needed
5. Test XP awarding and status updates

### Updating Security Rules

1. Edit `firestore.rules` or `storage.rules`
2. Test locally: `firebase emulators:start`
3. Deploy: `firebase deploy --only firestore:rules` or `./deploy.sh`
4. Verify in Firebase Console

### PWA Updates

1. Update `manifest.json` for app metadata
2. Update `service-worker.js` for caching strategy
3. Increment cache version in service-worker to force update
4. Test in Chrome DevTools > Application > Service Workers

## Environment and Configuration

### Firebase Project

- **Project ID**: `skatequest-666`
- **Hosting**: Firebase Hosting (supplementary)
- **Functions Region**: Default (us-central1)

### Netlify

- **Site**: skatequest.netlify.app
- **Custom Domain**: sk8.quest (configured via DNS)
- **Functions**: `.netlify/functions/` directory

### GitHub Actions Secrets

- `FIREBASE_TOKEN`: Firebase CI token for automated deployments

## Security Considerations

- Firebase security rules enforce read/write permissions
- User authentication required for challenge completion
- Cloud Functions validate user identity before awarding XP
- Client-side code only - API keys are safe to expose (protected by Firebase rules)
- Always validate user input and sanitize data before Firestore writes

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check Firebase config in `index.html`
2. **Module resolution errors**: Ensure using `window.firebaseInstances`, not bare imports
3. **Service worker not updating**: Clear cache and increment CACHE_NAME version
4. **Netlify Functions 404**: Verify function paths in `netlify/functions/`
5. **Security rules denying access**: Review and update `firestore.rules`

### Debug Tips

- Open browser DevTools console for JavaScript errors
- Check Network tab for failed API requests
- Use Firebase Console to inspect Firestore data and rules
- Check GitHub Actions logs for deployment issues

## Documentation

Additional documentation files:

- **AUTOMATION.md**: Complete automation setup guide
- **DEPLOY.md**: Deployment instructions
- **PRODUCTION.md**: Production environment setup
- **START.md**: Quick start guide
- **QUICK_REFERENCE.md**: Quick reference for common tasks

## Contact and Support

- **Repository**: https://github.com/treesus6/SkateQuest-App
- **Live Site**: https://sk8.quest
- **Firebase Console**: https://console.firebase.google.com/project/skatequest-666
