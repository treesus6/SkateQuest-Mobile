# SkateQuest Website

Professional landing page for **sk8.quest**

## Features

- 🎨 Modern, responsive design
- 📱 Mobile-optimized
- 📧 Contact form with auto-reply
- 📊 Analytics tracking ready
- 🚀 SEO optimized
- ⚡ Fast loading (static HTML/CSS/JS)

## Quick Deploy

### Deploy to Vercel (Recommended)
```bash
cd website
vercel
```

### Deploy to Netlify
```bash
cd website
netlify deploy --prod
```

### Deploy to GitHub Pages
```bash
# 1. Create repo: skatequest-website
# 2. Push this folder
# 3. Enable GitHub Pages in settings
```

## Configure Domain (sk8.quest)

### DNS Settings for Vercel
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### DNS Settings for Netlify
```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: [your-site].netlify.app
```

## Update APK Download Link

Once your APK is built, update line ~130 in `public/js/main.js`:

```javascript
document.getElementById('android-download').href = 'https://sk8.quest/downloads/skatequest-v1.0.0.apk';
```

## Email Setup

The contact form sends to Supabase. Make sure you've run the migration:
```bash
cd ..
npx supabase db push
```

## Local Development

```bash
cd website
python3 -m http.server 8000
# Visit: http://localhost:8000
```

## Structure

```
website/
├── index.html          # Main landing page
├── public/
│   ├── css/
│   │   └── styles.css  # All styles
│   ├── js/
│   │   └── main.js     # Form handling, analytics
│   └── images/         # Add your screenshots here
└── README.md
```

## Add Screenshots

Replace placeholders in `index.html` with real app screenshots:

1. Take screenshots (1080x1920px)
2. Save to `public/images/`:
   - `screenshot-map.png`
   - `screenshot-feed.png`
   - `screenshot-profile.png`
   - `screenshot-challenges.png`
3. Update image src in HTML

## SEO Checklist

- [ ] Add `og-image.jpg` (1200x630px) to `public/images/`
- [ ] Update meta description
- [ ] Submit sitemap to Google Search Console
- [ ] Add Google Analytics or PostHog
- [ ] Set up Google Business Profile

## Performance

Current page size: ~50KB (HTML + CSS + JS)
Load time: <1s

## Support

Issues? Email support@sk8.quest
