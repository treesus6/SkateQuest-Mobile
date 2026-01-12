# Deploying SkateQuest (static site) to Netlify

This repository is a static site (HTML/CSS/JS) and is ready to deploy to Netlify.

## GitHub Actions Configuration

To enable automated Firebase deployments via GitHub Actions:

### 1. Add FIREBASE_TOKEN Secret

- Go to **Settings → Secrets and variables → Actions → Secrets**
- Click "New repository secret"
- **Name**: `FIREBASE_TOKEN`
- **Value**: Run `firebase login:ci` to get your token

### 2. Add FIREBASE_PROJECT_ID Variable

- Go to **Settings → Secrets and variables → Actions → Variables**
- Click "New repository variable"
- **Name**: `FIREBASE_PROJECT_ID`
- **Value**: Your Firebase project ID (e.g., skatequest-666)

The GitHub Actions workflow (`.github/workflows/firebase-deploy.yml`) will automatically deploy Firebase rules when you push to the main branch.

Quick notes:

- The site is served from the project root (publish directory = `.`).
- Netlify Functions live in `netlify/functions/` and are deployed automatically when the site is published from the repository root.
- Firebase client keys are present in `index.html` for client-side usage. These keys are not secret, but make sure your Firebase security rules are production-ready.

Options to deploy

1. Drag & Drop (fastest)
   - Zip the repository contents (or select all files in the project root) and go to https://app.netlify.com/drop
   - Drop the folder/zip and Netlify will publish the site. There is no build step.

2# from repo root
python3 -m http.server 8000

# open http://127.0.0.1:8000 in your browser# from repo root

python3 -m http.server 8000

# open http://127.0.0.1:8000 in your browser) Connect from Git (recommended for updates)

- Push this repository to GitHub/GitLab/Bitbucket.
- In Netlify: Sites -> New site -> Import from Git -> choose provider and the repository.
- During site setup, set the "Publish directory" to `.` (project root). Leave the build command blank.

3. Netlify CLI (for local dev + deploy)
   - Install and login:

     ```bash

     ```

   # Deploying SkateQuest (static site) to Netlify

   This repository is a static site (HTML/CSS/JS) and is ready to deploy to Netlify.

   Quick notes:
   - The site is served from the project root (publish directory = `.`).
   - Netlify Functions live in `netlify/functions/` and are deployed automatically when the site is published from the repository root.
   - Firebase client keys are present in `index.html` for client-side usage. These keys are not secret, but make sure your Firebase security rules are production-ready.

   Options to deploy
   1. Drag & Drop (fastest)
      - Zip the repository contents (or select all files in the project root) and go to https://app.netlify.com/drop
      - Drop the folder/zip and Netlify will publish the site. There is no build step.

   2. Connect from Git (recommended for updates)
      - Push this repository to GitHub/GitLab/Bitbucket.
      - In Netlify: Sites -> New site -> Import from Git -> choose provider and the repository.
      - During site setup, set the "Publish directory" to `.` (project root). Leave the build command blank.

   3. Netlify CLI (for local dev + deploy)
      - Install and login:

        ```bash
        npm i -g netlify-cli
        netlify login
        ```

      - To test functions and static site locally:

        ```bash
        netlify dev
        ```

      - To deploy:

        ```bash
        netlify deploy --prod --dir="."
        ```

   Notes about Netlify Functions
   - Functions in `netlify/functions/` will be published as serverless endpoints under `/.netlify/functions/<name>`.
   - Function runtime is Node; convert functions to CommonJS (module.exports / exports.handler) for maximum compatibility (already done for `tricks.js`).

   Firebase & security
   - Firebase client config in `index.html` is expected for client-side Firebase usage. Do not store secrets in client code.
   - Harden Firestore/storage rules before production to prevent unauthorized writes/reads.

   Troubleshooting: service worker, cache, and manifest icons
   1. Clear service worker and caches (in browser console):

   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
   caches
     .keys()
     .then(keys =>
       Promise.all(keys.map(k => caches.delete(k))).then(() => console.log('Caches cleared'))
     );
   ```

4. Verify manifest icons are present and valid from your server (run from project root):

```bash
# start local server
python3 -m http.server 8000
# check icon exists and content-type
curl -I http://127.0.0.1:8000/icons/skatequest-icon-192.png
# verify it's a valid PNG
file icons/skatequest-icon-192.png
```

3. If icons were base64 text files instead of binary, decode them:

```bash
cd /workspaces/SkateQuest-App && python3 << 'EOF'
import base64
for filename in ['icons/skatequest-icon-192.png', 'icons/skatequest-icon-512.png']:
    with open(filename, 'r') as f:
        content = f.read().replace('\n', '').strip()
    missing_padding = len(content) % 4
    if missing_padding:
        content += '=' * (4 - missing_padding)
    binary_data = base64.b64decode(content)
    with open(filename, 'wb') as f:
        f.write(binary_data)
    print(f"✓ Decoded {filename}")
EOF
```

4. If icons are corrupt or not valid images, re-add valid PNG/SVG files to `icons/` and re-deploy. 4) If browser console shows: "Failed to resolve module specifier \"firebase/storage\"":
   - Ensure no files served directly to browsers use bare imports like `import { getStorage } from "firebase/storage"`.
   - Use the CDN initialization in `index.html` which exposes `window.firebaseInstances` and update your client JS to reference that (already done in `main.js`).

   If you'd like, I can also:
   - Add a small `netlify` deploy script or GitHub Action to auto-deploy on push.
   - Convert any remaining ESM function files to CommonJS for consistency.
