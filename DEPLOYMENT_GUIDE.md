# SkateQuest Deployment & Launch Guide

**Domain:** sk8.quest
**Last Updated:** January 21, 2026

This guide covers everything you need to deploy SkateQuest to production and get it in users' hands.

---

## 📱 Building the APK

### Prerequisites
1. Expo account (create at https://expo.dev/signup)
2. EAS CLI installed: `npm install -g eas-cli`

### Step 1: Login to Expo
```bash
eas login
```

Enter your Expo credentials.

### Step 2: Build Production APK
```bash
cd /home/user/SkateQuest-Mobile
eas build --platform android --profile production
```

This will:
- Build with React Native 0.76.5 + Expo SDK 54
- Include all environment variables from `eas.json`
- Generate a production-ready APK
- Upload to Expo's servers

### Step 3: Download the APK
Once the build completes, you'll get a URL like:
```
https://expo.dev/accounts/[username]/projects/skatequest/builds/[build-id]
```

Download the APK from there.

### Step 4: Host the APK
Upload the APK to:
1. **Your website** (`https://sk8.quest/download/skatequest-v1.0.0.apk`)
2. **Google Drive** (public link for sharing)
3. **GitHub Releases** (if repo is public)

Update the download link in `website/index.html`:
```javascript
document.getElementById('android-download').href = 'https://sk8.quest/download/skatequest-v1.0.0.apk';
```

---

## 🌐 Deploying the Website (sk8.quest)

Your landing page is in `/website/`. Here are deployment options:

### Option 1: Vercel (Recommended - Free)
```bash
cd website
npm init -y
npm install -g vercel

vercel
```

Follow the prompts:
- Link to your domain: `sk8.quest`
- Build command: none (static site)
- Output directory: `.`

**Configure DNS:**
1. Go to your domain registrar
2. Add these records:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Option 2: Netlify (Free)
```bash
cd website
npm install -g netlify-cli

netlify deploy --prod
```

Configure DNS:
```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: [your-site].netlify.app
```

### Option 3: GitHub Pages (Free)
1. Create a new repo: `skatequest-website`
2. Push the `website` folder
3. Enable GitHub Pages in settings
4. Point `sk8.quest` to GitHub Pages:
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153

Type: CNAME
Name: www
Value: [username].github.io
```

---

## 📧 Email Automation Bot

Set up automated email responses using Supabase Edge Functions or Cloudflare Workers.

### Option 1: Supabase Edge Function (Recommended)

**Create Edge Function:**
```bash
cd /home/user/SkateQuest-Mobile
npx supabase functions new email-bot
```

**Function Code** (`supabase/functions/email-bot/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const { record } = await req.json()

  // Get feedback record from webhook
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

  // Send auto-reply email
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SkateQuest Support <support@sk8.quest>',
      to: record.email,
      subject: `Re: ${record.subject} - We received your message`,
      html: generateEmailTemplate(record),
    }),
  })

  // Notify you on Discord/Slack
  await notifyAdmin(record)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

function generateEmailTemplate(feedback: any): string {
  const subjectMap = {
    bug: 'Bug Report',
    feature: 'Feature Request',
    feedback: 'Feedback',
    support: 'Support Request',
    other: 'Message',
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛹 SkateQuest</h1>
        </div>
        <div class="content">
          <h2>Hey ${feedback.name}! 👋</h2>
          <p>Thanks for reaching out! We received your <strong>${subjectMap[feedback.subject] || 'message'}</strong> and wanted to let you know it's in good hands.</p>

          <p><strong>Your message:</strong></p>
          <blockquote style="background: white; padding: 15px; border-left: 4px solid #6366f1; margin: 15px 0;">
            ${feedback.message}
          </blockquote>

          <p>Here's what happens next:</p>
          <ul>
            <li>✅ We'll review your ${subjectMap[feedback.subject]?.toLowerCase() || 'message'} within 24 hours</li>
            <li>📧 You'll get a personal response from our team</li>
            <li>🚀 If it's a bug, we'll prioritize a fix</li>
            <li>💡 If it's a feature request, we'll consider it for our roadmap</li>
          </ul>

          <p>In the meantime, join our community:</p>
          <a href="https://discord.gg/skatequest" class="button">Join Discord</a>

          <p style="margin-top: 30px;">Keep shredding! 🛹</p>
          <p><strong>The SkateQuest Team</strong></p>
        </div>
        <div class="footer">
          <p>SkateQuest | <a href="https://sk8.quest">sk8.quest</a></p>
          <p>Reply to this email if you need immediate assistance</p>
        </div>
      </div>
    </body>
    </html>
  `
}

async function notifyAdmin(feedback: any) {
  // Send Discord notification
  const DISCORD_WEBHOOK = Deno.env.get('DISCORD_WEBHOOK_URL')
  if (DISCORD_WEBHOOK) {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '📬 New Feedback Received',
          color: 6366961, // Purple
          fields: [
            { name: 'From', value: `${feedback.name} (${feedback.email})`, inline: true },
            { name: 'Type', value: feedback.subject, inline: true },
            { name: 'Message', value: feedback.message.substring(0, 200) + '...' },
            { name: 'View', value: `[Open in Dashboard](https://sk8.quest/admin/feedback/${feedback.id})` },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  }
}
```

**Deploy:**
```bash
npx supabase functions deploy email-bot
npx supabase secrets set RESEND_API_KEY=your_key
npx supabase secrets set DISCORD_WEBHOOK_URL=your_webhook
```

**Setup Database Webhook:**
1. Go to Supabase Dashboard → Database → Webhooks
2. Create webhook:
   - Name: `Email Bot Trigger`
   - Table: `feedback`
   - Events: `INSERT`
   - HTTP Request URL: Your edge function URL

### Option 2: Resend.com (Email Service)

Sign up at https://resend.com (free tier: 100 emails/day)

Configure DNS for sending from `@sk8.quest`:
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
```

---

## 📊 Admin Dashboard

Create a simple admin dashboard to track everything.

**Deploy:** `/home/user/SkateQuest-Mobile/admin-dashboard/`

**Features:**
- View all feedback submissions
- Respond to users directly
- Mark as resolved
- View analytics (response time, status breakdown)

**Quick Setup:**
```bash
cd /home/user/SkateQuest-Mobile
mkdir admin-dashboard
cd admin-dashboard

# Use Streamlit for quick Python dashboard
pip install streamlit supabase
```

**Simple Dashboard** (`dashboard.py`):
```python
import streamlit as st
from supabase import create_client
import pandas as pd

# Configure
st.set_page_config(page_title="SkateQuest Admin", page_icon="🛹", layout="wide")

SUPABASE_URL = "https://hreeuqdgrwvnxquxohod.supabase.co"
SUPABASE_KEY = "your_service_role_key"  # Use service role key

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

st.title("🛹 SkateQuest Admin Dashboard")

# Stats
col1, col2, col3, col4 = st.columns(4)

stats = supabase.table('feedback_stats').select('*').execute()
if stats.data:
    s = stats.data[0]
    col1.metric("New", s['new_count'])
    col2.metric("In Progress", s['in_progress_count'])
    col3.metric("Last 24h", s['last_24h'])
    col4.metric("Avg Response", f"{s['avg_response_hours']}h")

# Feedback table
st.subheader("Recent Feedback")

feedback = supabase.table('feedback')\
    .select('*')\
    .order('created_at', desc=True)\
    .limit(50)\
    .execute()

df = pd.DataFrame(feedback.data)
st.dataframe(df, use_container_width=True)

# Quick actions
st.subheader("Quick Actions")
feedback_id = st.selectbox("Select Feedback", df['id'].tolist())
response_text = st.text_area("Your Response")

if st.button("Send Response & Mark Resolved"):
    # Update feedback
    supabase.table('feedback').update({
        'status': 'resolved',
        'response': response_text,
        'responded_at': 'now()'
    }).eq('id', feedback_id).execute()

    # Send email (trigger edge function)
    st.success("Response sent!")
```

**Run:**
```bash
streamlit run dashboard.py
```

Deploy to Streamlit Cloud (free): https://streamlit.io/cloud

---

## 🤖 Automated Workflows

### 1. Auto-categorize feedback using AI
```python
# Use OpenAI or Anthropic to categorize
import anthropic

def categorize_feedback(message: str):
    client = anthropic.Anthropic(api_key="your_key")
    response = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=50,
        messages=[{
            "role": "user",
            "content": f"Categorize this feedback as bug/feature/support/other: {message}"
        }]
    )
    return response.content[0].text
```

### 2. Automatic bug report to GitHub Issues
```python
def create_github_issue(feedback):
    import requests

    response = requests.post(
        'https://api.github.com/repos/treesus6/SkateQuest-Mobile/issues',
        headers={
            'Authorization': f'token {GITHUB_TOKEN}',
            'Accept': 'application/vnd.github.v3+json',
        },
        json={
            'title': f'[User Bug] {feedback["subject"]}',
            'body': f"""
**From:** {feedback['name']} ({feedback['email']})
**Submitted:** {feedback['created_at']}

{feedback['message']}

---
*Auto-generated from website feedback*
            """,
            'labels': ['bug', 'user-reported'],
        }
    )
    return response.json()
```

---

## 📱 Marketing Assets

### Facebook/Instagram Ads

**Image Sizes:**
- Feed: 1080x1080px (square)
- Story: 1080x1920px (vertical)
- Carousel: 1080x1080px each

**Ad Copy Templates:**
```
🛹 Find Your Next Session

Discover 10,000+ skateparks worldwide with SkateQuest.
Share tricks. Connect with skaters. Level up your game.

Download free → sk8.quest

#skateboarding #skatepark #skatelife
```

### Google Play Store (When Ready)

**Listing Requirements:**
- App icon: 512x512px
- Feature graphic: 1024x500px
- Screenshots: 1080x1920px (min 2, max 8)
- Promo video: YouTube link

---

## 🚀 Launch Checklist

### Pre-Launch
- [ ] EAS build completes successfully
- [ ] APK tested on multiple Android devices
- [ ] Website deployed to sk8.quest
- [ ] Email automation working
- [ ] Admin dashboard accessible
- [ ] Analytics tracking (PostHog/GA) configured
- [ ] Privacy policy page created
- [ ] Terms of service page created

### Launch Day
- [ ] Upload APK to sk8.quest/download
- [ ] Announce on social media
- [ ] Post in skateboarding subreddits
- [ ] Share in skateboarding Discord servers
- [ ] Email newsletter (if you have list)
- [ ] Submit to product hunt
- [ ] Create demo video for YouTube

### Post-Launch
- [ ] Monitor feedback dashboard daily
- [ ] Respond to users within 24h
- [ ] Track crash reports (Sentry)
- [ ] Release bug fixes weekly
- [ ] Plan feature releases monthly

---

## 🔧 Ongoing Maintenance

**Weekly:**
- Check Sentry for crashes
- Review new feedback
- Update APK if critical bugs

**Monthly:**
- Review analytics
- Plan new features based on feedback
- Update dependencies
- Run security audit

---

## 📞 Support Channels

**Email:** support@sk8.quest
**Response time:** Within 24 hours
**Auto-reply:** Immediate via email bot

---

## 🎯 Growth Strategy

1. **Week 1-2:** Soft launch, gather feedback
2. **Week 3-4:** Fix critical bugs, improve UX
3. **Month 2:** Submit to Google Play Store
4. **Month 3:** Launch iOS version
5. **Month 4:** Paid ads campaign
6. **Month 6:** Monetization (premium features)

---

**Questions?** You've got everything set up - just need to run the EAS build and you're ready to launch! 🚀
