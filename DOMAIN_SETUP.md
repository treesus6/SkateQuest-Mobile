# Domain Setup - sk8.quest

## Primary Domain

**sk8.quest** - Official shortened domain (OWNED ✅)

### Domain Configuration

**Current Setup:**

- Primary: https://sk8.quest
- Short Link: https://sk8.quest (redirects to primary)
- Status: Active and paid for

### DNS Configuration Needed:

```
Type    Name    Value                           TTL
A       @       [Your hosting IP]              Auto
CNAME   www     sk8.quest                   Auto
CNAME   sk8     sk8.quest                   Auto
```

**For Netlify:**

```
1. Add custom domain: sk8.quest
2. Set up automatic HTTPS
3. Configure redirects in netlify.toml:
   [[redirects]]
     from = "https://sk8.quest/*"
     to = "https://sk8.quest/:splat"
     status = 301
     force = true
```

**For Firebase Hosting:**

```
firebase.json:
{
  "hosting": {
    "site": "skatequest",
    "public": "public",
    "rewrites": [{
      "source": "**",
      "destination": "/index.html"
    }],
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Cache-Control",
        "value": "public, max-age=3600"
      }]
    }]
  }
}

Then run:
firebase hosting:channel:deploy production
```

### Redirect Strategy

**All domains should redirect to primary:**

- sk8.quest → sk8.quest (✅)
- skatequest.com → sk8.quest
- www.skatequest.com → sk8.quest

### Use Cases for sk8.quest

**1. QR Codes:**

```
https://sk8.quest/qr/ABC123
```

Shorter URLs fit better on printed QR codes

**2. Social Media:**

```
Visit sk8.quest to join!
```

Easier to remember and type

**3. Marketing Materials:**

```
sk8.quest - Discover. Connect. Give Back.
```

Clean, memorable branding

**4. Deep Links:**

```
https://sk8.quest/spot/[spot-id]
https://sk8.quest/crew/[crew-id]
https://sk8.quest/event/[event-id]
https://sk8.quest/charity
```

### URL Structure

**Primary Site:**

- Homepage: https://sk8.quest
- About: https://sk8.quest/about (future)
- Charity: https://sk8.quest/charity (future separate page)

**Short Links (sk8.quest):**

- QR Codes: https://sk8.quest/qr/{code}
- Spots: https://sk8.quest/s/{id}
- Crews: https://sk8.quest/c/{id}
- Events: https://sk8.quest/e/{id}

### SSL/HTTPS Setup

**Required for both domains:**

- Let's Encrypt certificates (auto with Netlify/Firebase)
- Force HTTPS redirects
- HSTS headers

### Email Setup (Future)

**Professional Email Addresses:**

- hello@sk8.quest
- support@sk8.quest
- partnerships@sk8.quest
- press@sk8.quest
- invest@sk8.quest

**Or using short domain:**

- hello@sk8.quest
- team@sk8.quest
- help@sk8.quest

**Recommended Provider:**

- Google Workspace ($6/user/mo)
- Zoho Mail ($1/user/mo, budget option)
- ProtonMail (privacy-focused)

### Branding Consistency

**Always use:**

- **Written**: sk8.quest (lowercase, period)
- **Spoken**: "skate quest" or "s-k-eight-quest"
- **Displayed**: SkateQuest (logo/branding)

**Examples:**

- ✅ "Visit sk8.quest to join the movement"
- ✅ "Download SkateQuest at sk8.quest"
- ❌ "Visit sk8.quest" (use primary sk8.quest or short sk8.quest)

---

## Domain Renewal & Management

**Registrar:** [Add your registrar info]
**Registered:** [Date purchased]
**Expires:** [Expiration date]
**Auto-Renew:** [Yes/No]

**IMPORTANT:**

- Set calendar reminder 60 days before expiration
- Enable auto-renewal to prevent losing domain
- Keep registrar account credentials secure
- Enable 2FA on registrar account

---

## Analytics & Tracking

**Google Analytics 4:**

```javascript
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    'page_location': window.location.href,
    'cookie_domain': 'sk8.quest'
  });
</script>
```

**Track both domains but consolidate reporting:**

- Set up cross-domain tracking
- Use same GA property for both
- Filter views by hostname if needed

---

## Security

**Domain Protection:**

- ✅ Enable domain privacy/WHOIS protection
- ✅ Enable registrar transfer lock
- ✅ Use strong, unique registrar password
- ✅ Enable 2FA on registrar account
- ✅ Monitor domain status monthly

**DNS Security:**

- Use Cloudflare for DDoS protection (free tier)
- Enable DNSSEC
- Set up CAA records to prevent unauthorized SSL certs

---

## SEO Configuration

**Primary Domain (sk8.quest):**

```html
<link rel="canonical" href="https://sk8.quest/" />
<meta property="og:url" content="https://sk8.quest/" />
```

**All alternate domains redirect with 301:**

- Preserves SEO juice
- Consolidates link equity
- Clear primary domain for search engines

---

**Domain Status: ✅ ACTIVE & CONFIGURED**

_Last Updated: November 30, 2024_
