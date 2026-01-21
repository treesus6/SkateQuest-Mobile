# 🚀 SkateQuest Launch Plan

**One-Person Army Edition**

Your complete step-by-step guide to launching SkateQuest at **sk8.quest**

---

## Phase 1: Build the APK (Today)

### Step 1.1: Login to Expo
```bash
eas login
```
*Enter your Expo account credentials*

### Step 1.2: Build Production APK
```bash
cd /home/user/SkateQuest-Mobile
eas build --platform android --profile production
```

**What happens:**
- Takes 10-15 minutes
- Builds with React 18.3.1 + RN 0.76.5 + Expo SDK 54
- All fixed dependencies included
- Mapbox properly configured
- Environment variables injected

### Step 1.3: Download APK
Once build completes:
1. Go to link provided (https://expo.dev/accounts/...)
2. Download the APK file
3. Rename it: `skatequest-v1.0.0.apk`

### Step 1.4: Test the APK
```bash
# Install on your Android device
adb install skatequest-v1.0.0.apk

# Or send to your phone and install manually
```

**Test checklist:**
- [ ] App opens without crashes
- [ ] Can sign up / log in
- [ ] Map loads and shows skateparks
- [ ] Can take/upload photo
- [ ] Camera works
- [ ] Navigation works

---

## Phase 2: Deploy Website (1 hour)

### Step 2.1: Sign up for Vercel
1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Install Vercel CLI: `npm install -g vercel`

### Step 2.2: Deploy Website
```bash
cd /home/user/SkateQuest-Mobile/website
vercel
```

Follow prompts:
- Project name: `skatequest`
- Deploy: Yes
- Production: Yes

You'll get: `https://skatequest-xyz.vercel.app`

### Step 2.3: Connect Your Domain (sk8.quest)

**In Vercel Dashboard:**
1. Go to Project Settings → Domains
2. Add domain: `sk8.quest`
3. Add domain: `www.sk8.quest`

**In Your Domain Registrar (where you bought sk8.quest):**
1. Go to DNS Settings
2. Add these records:

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Wait 10-60 minutes for DNS to propagate**

### Step 2.4: Upload APK to Website
```bash
# Create downloads folder
mkdir -p /home/user/SkateQuest-Mobile/website/public/downloads

# Copy APK there
cp skatequest-v1.0.0.apk /home/user/SkateQuest-Mobile/website/public/downloads/

# Redeploy
cd /home/user/SkateQuest-Mobile/website
vercel --prod
```

### Step 2.5: Update Download Link
Edit `website/public/js/main.js` line ~56:
```javascript
document.getElementById('android-download').href = 'https://sk8.quest/downloads/skatequest-v1.0.0.apk';
```

Redeploy:
```bash
vercel --prod
```

---

## Phase 3: Setup Email Automation (30 minutes)

### Step 3.1: Sign up for Resend.com
1. Go to https://resend.com/signup
2. Create account (free: 100 emails/day)
3. Get API key from dashboard

### Step 3.2: Verify Domain for Email
In Resend dashboard:
1. Add domain: `sk8.quest`
2. Copy DNS records

In your domain registrar:
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com

Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10
```

**Wait 10-30 minutes for verification**

### Step 3.3: Deploy Email Bot
```bash
cd /home/user/SkateQuest-Mobile

# Install Supabase CLI if not installed
npm install -g supabase

# Create edge function
npx supabase functions new email-bot
```

Copy the email bot code from DEPLOYMENT_GUIDE.md

```bash
# Set secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxx
npx supabase secrets set SUPABASE_URL=https://hreeuqdgrwvnxquxohod.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Deploy
npx supabase functions deploy email-bot
```

### Step 3.4: Setup Database Webhook
1. Go to Supabase Dashboard
2. Database → Webhooks → Create Webhook
3. Settings:
   - Name: `Email Bot`
   - Table: `feedback`
   - Events: `INSERT`
   - URL: (Your edge function URL from previous step)

**Test it:**
1. Go to https://sk8.quest
2. Fill out contact form
3. Check your email for auto-reply!

---

## Phase 4: Setup Admin Dashboard (20 minutes)

### Option A: Simple Supabase Dashboard
1. Go to https://hreeuqdgrwvnxquxohod.supabase.co
2. Navigate to Table Editor → `feedback`
3. View all submissions here
4. Manually respond via email

### Option B: Custom Dashboard (Streamlit)
```bash
cd /home/user/SkateQuest-Mobile
mkdir admin-dashboard
cd admin-dashboard

# Install dependencies
pip install streamlit supabase pandas

# Create dashboard.py (code in DEPLOYMENT_GUIDE.md)

# Run locally
streamlit run dashboard.py
```

**Deploy to Streamlit Cloud:**
1. Sign up: https://streamlit.io/cloud
2. Connect GitHub repo
3. Deploy `dashboard.py`
4. Access at: https://[your-app].streamlit.app

---

## Phase 5: Launch Day! 🎉

### Morning of Launch

**1. Final Checks (30 min)**
- [ ] Visit https://sk8.quest - loads correctly
- [ ] Download APK works
- [ ] Contact form works
- [ ] Auto-reply email works
- [ ] APK installs on phone
- [ ] App works on phone

**2. Prepare Social Media Posts (30 min)**

**Twitter/X:**
```
🛹 Launching SkateQuest!

Find skateparks, share tricks, connect with skaters worldwide.

✨ 10,000+ skateparks mapped
📸 Share photos & videos
🏆 Challenges & leaderboards
🗺️ Interactive map

Download free: sk8.quest

#skateboarding #app #launch
```

**Instagram:**
```
🛹 SKATEQUEST IS HERE!

Your new skateboarding companion app:

📍 Discover skateparks near you
🎥 Share your best tricks
🏆 Compete in challenges
👥 Connect with the community

Free download: sk8.quest

#skateboarding #skatepark #app #launch #tricks
```

**Reddit Posts:**
- r/skateboarding
- r/NewSkaters
- r/AndroidApps
- r/SideProject

**3. Launch Sequence (10 AM recommended)**

1. Post on Twitter
2. Post on Instagram
3. Post on Reddit (stagger by 30 min each)
4. Post in Discord servers
5. Email friends/family

### Throughout Launch Day

**Monitor:**
- Supabase feedback table
- Email inbox (support@sk8.quest)
- Sentry for crashes
- Social media comments

**Respond to:**
- Every feedback within 2 hours
- Every social media comment within 1 hour
- Critical bugs immediately

---

## Phase 6: First Week Post-Launch

### Daily Tasks
- [ ] Check feedback dashboard (morning & evening)
- [ ] Respond to all emails
- [ ] Monitor Sentry for crashes
- [ ] Reply to social media
- [ ] Track downloads/signups

### Week 1 Goals
- 100 downloads
- 50 active users
- 0 critical bugs
- <10% crash rate
- Gather 20+ feedback submissions

### Quick Fixes
If you find bugs:

```bash
# Fix the bug in code
# Then rebuild
eas build --platform android --profile production

# Download new APK
# Upload to website/public/downloads/
# Update version number

# Announce update
```

---

## Phase 7: Growth (Months 1-3)

### Month 1: Stabilize
- Fix all critical bugs
- Improve UX based on feedback
- Add most-requested features
- Release 2-3 updates

### Month 2: Expand
- Submit to Google Play Store
- Start iOS development
- Create video demos
- Partner with skate shops

### Month 3: Scale
- Run paid ads ($100-500/month)
- Influencer partnerships
- App Store Optimization (ASO)
- Email newsletter

---

## Emergency Contacts

**If Something Breaks:**

1. **App Crashes:** Check Sentry dashboard
2. **Website Down:** Check Vercel status
3. **Emails Not Sending:** Check Resend dashboard
4. **Database Issues:** Check Supabase status

**Get Help:**
- Expo Discord: https://chat.expo.dev
- Supabase Discord: https://discord.supabase.com
- Post on r/reactnative

---

## Monetization Plan (Month 4+)

### Free Tier (Keep Forever)
- Browse skateparks
- Basic profile
- Post 10 media items/month
- View challenges

### Premium ($4.99/month)
- Unlimited media uploads
- Advanced analytics
- Ad-free experience
- Custom profile themes
- Priority support
- Early access to features

**Implementation:**
- Use RevenueCat for subscriptions
- Implement in Month 4
- Target: 5% conversion rate

---

## Metrics to Track

### Week 1
- Downloads
- Daily active users
- Crash rate
- Feedback submissions

### Month 1
- User retention (day 1, 7, 30)
- Avg session duration
- Media uploads per user
- Skateparks visited per user

### Month 3
- Monthly active users (MAU)
- Engagement rate
- Viral coefficient (K-factor)
- Churn rate

---

## One-Person Army Tips

**Time Management:**
- Block 2 hours/day for support
- Block 4 hours/day for development
- Block 1 hour/day for marketing

**Don't Burn Out:**
- Ship imperfect features
- Ignore trolls
- Celebrate small wins
- Ask for help when stuck

**Prioritize:**
1. Fix crashes (urgent)
2. Fix critical bugs (24h)
3. Respond to users (24h)
4. Add new features (weekly)
5. Marketing (daily 30 min)

---

## You've Got This! 🚀

Everything is ready:
✅ App code fixed and stable
✅ Dependencies aligned
✅ Website built
✅ Email automation ready
✅ Feedback system ready
✅ Admin dashboard ready
✅ Deployment guides written

**Next step:** Run `eas login` and `eas build` to get your APK!

Questions? You have all the docs. You've got everything you need to launch.

**Let's get SkateQuest in users' hands!** 🛹

---

*Remember: Perfect is the enemy of done. Ship it, learn, iterate.* ✨
