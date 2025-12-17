# Environment Variables - Quick Reference

## 🚀 Quick Commands

### Switch to Development
```bash
./switch-env.sh development
expo start -c
```

### Switch to Production
```bash
./switch-env.sh production
expo start -c
```

### View Current Environment
```bash
cat .env | head -n 5
```

## 📋 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | ✅ Yes | Supabase anon key |
| `EXPO_PUBLIC_SENTRY_DSN` | ❌ No | Error tracking (Sentry) |
| `EXPO_PUBLIC_OPENAI_API_KEY` | ❌ No | AI trick analysis |

## 📁 File Structure

```
├── .env.example          # Template (COMMIT) ✅
├── .env.development      # Dev config (IGNORE) 🔒
├── .env.production       # Prod config (IGNORE) 🔒
├── .env                  # Active environment 🔄
└── switch-env.sh         # Environment switcher 🔧
```

## 🔧 Common Tasks

### Initial Setup
```bash
# 1. Copy template
cp .env.example .env.development

# 2. Edit with your values
nano .env.development

# 3. Activate development environment
./switch-env.sh development
```

### Add Production Environment
```bash
# 1. Copy template
cp .env.example .env.production

# 2. Add production credentials
nano .env.production

# 3. Switch when ready to build
./switch-env.sh production
```

### Troubleshooting
```bash
# Clear cache and restart
expo start -c

# Check if variables are loaded
grep EXPO_PUBLIC .env

# Verify Supabase connection
curl $(grep SUPABASE_URL .env | cut -d'=' -f2)
```

## ⚡ Tips

1. **Always restart with cache clear** after switching environments:
   ```bash
   expo start -c
   ```

2. **Check which environment is active**:
   ```bash
   head -n 1 .env
   ```

3. **Never commit** `.env.development` or `.env.production`

4. **Use different Supabase projects** for dev and prod when possible

5. **Test in development first** before building for production

## 🔗 Links

- [Full Documentation](./ENVIRONMENT_SETUP.md)
- [Supabase Dashboard](https://app.supabase.com)
- [Sentry Dashboard](https://sentry.io)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
