# SkateQuest 🛹

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/treesus6/SkateQuest-App/releases/tag/v2.0.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production-success.svg)](https://sk8.quest)

A Progressive Web App (PWA) that helps skateboarders discover, share, and track local skating spots. Join challenges, earn badges and XP, connect with the skating community, and help kids get skateboards through our charity system!

**🚀 Live at:** [sk8.quest](https://sk8.quest)

## 🌟 Features

### Core Features
- **Interactive Map**: Discover skate spots worldwide with Leaflet.js mapping
- **Click to Add Spots**: Simply click anywhere on the map to add a new skate spot at that location
- **Challenges System**: Complete skate challenges to earn XP and unlock achievements
- **Video Recording**: Record trick videos directly in the app
- **Trick Library**: 60+ skateboarding tricks organized by difficulty level

### Community & Social
- **Crews/Teams**: Create or join crews, compete on crew leaderboards, earn collective XP
- **Events & Meetups**: Create skateboarding events, RSVP to sessions, find local meetups
- **Session Tracking**: Track your skate sessions with live timer, earn XP, view session history
- **Leaderboards**: Compete with other skaters, track your rank and progress

### Charity System 🛹❤️
- **Buy QR Codes**: Purchase QR codes ($2+) with 100% proceeds going to help kids get skateboards
- **Custom Trick Challenges**: Add trick challenges to your QR codes (e.g., "Kickflip", "50-50 Grind")
- **Skateboard-Shaped QR Codes**: Beautiful, printable QR codes designed like skateboard decks
- **Scavenger Hunts**: Hide codes around town for others to find and scan
- **Impact Dashboard**: Track total raised, skateboards donated, kids helped
- **XP Rewards**: Finders earn XP (50-500) for discovering and completing challenges

### Technical
- **PWA Ready**: Install as an app on mobile devices
- **Offline Support**: Service worker caches assets for offline use
- **Supabase Backend**: Modern, scalable database with real-time updates
- **PostGIS Integration**: Advanced geographic queries for location-based features

## 🚀 Live Sites

- **Primary**: https://sk8.quest
- **Netlify**: https://skatequest.netlify.app

## 📱 How to Use

### Getting Started
1. **Discover Spots**: Browse the map to find skate spots near you
2. **Add Your Own**: Click "Add Spot" then click anywhere on the map to place a new spot
3. **Join Challenges**: Complete skate challenges to earn XP
4. **Record Tricks**: Use the camera to record and share your best tricks
5. **Track Progress**: View your profile to see XP, badges, and spots added

### Community Features
6. **Join a Crew**: Find or create a crew, compete together on leaderboards
7. **Track Sessions**: Start session timer when you skate, earn XP automatically (5 XP/min, max 200)
8. **Attend Events**: RSVP to local skateboarding meetups and competitions
9. **Visit Skate Shops**: Find local skate shops with Instagram links and directions

### Charity System - Help Kids Skate! 🛹❤️
10. **Buy QR Codes**: Click "Charity" → Purchase QR codes starting at $2
11. **Customize**: Add trick challenges, custom messages, and XP rewards to your codes
12. **Download & Print**: Get your skateboard-shaped QR code as a PNG image
13. **Hide Around Town**: Print it out and hide it somewhere cool for others to find
14. **Mark as Hidden**: Let others know where to search (vague description)
15. **Scan to Win**: Find hidden codes, scan them, complete tricks, earn XP!
16. **Track Impact**: See how much the community has raised and how many kids got boards

## 🎯 Quick Start

### For Users
1. Visit [sk8.quest](https://sk8.quest)
2. Click "Add to Home Screen" on mobile to install as an app
3. Start discovering and sharing skate spots!

### For Developers

#### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/treesus6/SkateQuest-App.git
cd SkateQuest-Mobile
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy the example environment file and fill in your values:
```bash
cp .env.example .env.development
```

Edit `.env.development` and add your configuration:
- **EXPO_PUBLIC_SUPABASE_URL** - Your Supabase project URL (from [Supabase Dashboard](https://app.supabase.com))
- **EXPO_PUBLIC_SUPABASE_KEY** - Your Supabase anon/public key
- **EXPO_PUBLIC_SENTRY_DSN** - (Optional) Your Sentry DSN for error tracking
- **EXPO_PUBLIC_OPENAI_API_KEY** - (Optional) OpenAI API key for AI trick analysis

4. **Start the development server**
```bash
npm start
```

#### Switching Between Environments

The app automatically uses different environment files based on your setup:

**Development Mode** (default):
```bash
# Uses .env.development
npm start
```

**Production Build**:
```bash
# Uses .env.production
# Make sure to create and configure .env.production first
cp .env.example .env.production
# Edit .env.production with production credentials

# Then build for your platform:
npm run android  # For Android
npm run ios      # For iOS
```

**Environment Variable Files**:
- `.env.development` - Used during development (`npm start`)
- `.env.production` - Used for production builds
- `.env.example` - Template file (commit this to Git)
- `.env` - Legacy file (can be removed if using environment-specific files)

**Important Notes**:
- All environment variables must start with `EXPO_PUBLIC_` to be accessible in your app
- Never commit `.env.development` or `.env.production` files to Git (they contain secrets)
- Always commit `.env.example` with placeholder values for team members

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for full deployment guide.

## 📚 Documentation

### User Documentation
- **README.md** (this file) - Feature overview and quick start guide
- **Charity System** - See "How to Use" section above for charity QR code guide

### Developer Documentation
- **[SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md)** - Complete guide for Supabase setup and migration
- **[MIGRATION_QUICK_REFERENCE.md](MIGRATION_QUICK_REFERENCE.md)** - Quick reference for common Supabase patterns
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes (if exists)
- **[SPONSORSHIP_PROPOSAL.md](SPONSORSHIP_PROPOSAL.md)** - Sponsorship packages for brands

### Database Schemas
- **[supabase-schema.sql](supabase-schema.sql)** - Main database schema for all features
- **[supabase-charity-schema.sql](supabase-charity-schema.sql)** - Charity QR code system schema

---

## 🛠️ Development & Deployment

SkateQuest — Deploying to Netlify

This folder contains a static site (HTML, CSS, JS) for SkateQuest.
Use one of the methods below to deploy to Netlify.

## Setting up GitHub Actions Secrets and Variables

To enable automated Firebase deployments via GitHub Actions, configure these secrets and variables:

### Required Secrets
1. Go to your repository's **Settings → Secrets and variables → Actions → Secrets**
2. Add a new secret:
   - **Name**: `FIREBASE_TOKEN`
   - **Value**: Get your token by running `firebase login:ci` in your terminal
   
### Required Variables
1. Go to your repository's **Settings → Secrets and variables → Actions → Variables**
2. Add a new variable:
   - **Name**: `FIREBASE_PROJECT_ID`
   - **Value**: Your Firebase project ID (e.g., skatequest-666)

Once configured, the GitHub Actions workflow will automatically deploy Firebase security rules when you push to the main branch.

Quick options

1) Drag & Drop (fastest)
- Zip the contents of this folder (or open the folder in your file manager and select all files).
- Go to https://app.netlify.com/drop and drop the folder/zip.
- Netlify will publish a site and give you a URL.

2) Connect a Git repository (recommended for updates)
- Create a GitHub repository and push this project.
  ```bash
  cd "C:\Users\treev\OneDrive\Apps\Desktop\skateguest-deploy\skatequest-deploy 1"
  git init
  git add .
  git commit -m "Initial SkateQuest site"
  # create repo on GitHub and push (replace URL)
  git remote add origin https://github.com/<your-username>/<repo>.git
  git push -u origin main
  ```
- In Netlify: Sites → New site → Import from Git → choose Git provider and repository.
- During setup, set the "Publish directory" to the project root (leave blank or put "."). There's no build command.

3) Netlify CLI (for power users)
- Install the CLI and deploy directly:
  ```bash
  npm i -g netlify-cli
  netlify login
  netlify deploy --prod --dir="."
  ```

Notes & tips
- This is a static site; no build required. `netlify.toml` sets the publish directory to the project root.
- Keep your Firebase config keys safe. They are already included in the code for this demo. If you want to lock read/write rules, configure your Firebase console security rules.
- If you see issues with icons or the manifest, make sure the `icons/` directory is present and was uploaded.

Local testing
- Quick local server (PowerShell):
  ```powershell
  cd "C:\Users\treev\OneDrive\Apps\Desktop\skateguest-deploy\skatequest-deploy 1"
  python -m http.server 8000
  # open http://localhost:8000
  ```
- Or use Live Server extension in VS Code.

If you want I can:
- Prepare a GitHub repo for you (you'll need to provide access or do the push yourself).
- Walk through the Netlify Connect-from-Git flow step-by-step while you do the clicks.
- Configure environment variables in Netlify for any secrets.

---

Quick local test for the new gameplay UI (pending challenges & completion):

1) Serve the project locally (PowerShell):

```powershell
cd "C:\Users\treev\OneDrive\Apps\Desktop\skateguest-deploy\skatequest-deploy 1"
python -m http.server 8000
# then open http://localhost:8000 in a browser
```

2) Open the app in the browser, open DevTools -> Console to watch logs.
3) Use the Challenge panel to create an issue (Issue Challenge).
4) In the Pending Challenges panel, click Complete for the new challenge.
5) Verify XP and streak updates, badges, and leaderboard changes.

If you want, I can push these edits to the repo and trigger a Netlify deploy. Say "push and deploy" and I'll make the commit and push.
