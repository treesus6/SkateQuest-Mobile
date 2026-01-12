# BUILD YOUR APK/IPA - SIMPLE VERSION

Forget the script. Just run these 2 commands:

## Step 1: Login (one time)

```bash
npx eas-cli login
```

When prompted:

- Email: `treevanderveer@gmail.com`
- Password: `Keagenj213@`

## Step 2: Build BOTH platforms

```bash
npx eas-cli build --platform all --profile production
```

That's it!

## What happens:

1. Build starts on Expo's cloud servers
2. Takes ~15-20 minutes
3. You'll see progress in terminal
4. At the end, you get download links

## Download your apps:

After build completes, go to:
https://expo.dev

Click "Builds" → Download APK and IPA

## Then distribute:

- Upload APK to APKPure (instant, free)
- Upload to Google Play ($25)
- Upload IPA to TestFlight/App Store ($99/year)

---

# Troubleshooting

**If login fails:**

```bash
npm install -g eas-cli
eas login
```

**If build fails:**
Make sure you're in the project directory:

```bash
cd SkateQuest-Mobile
npx eas-cli build --platform all --profile production
```

**To build JUST Android (faster):**

```bash
npx eas-cli build --platform android --profile production
```

**To build JUST iOS:**

```bash
npx eas-cli build --platform ios --profile production
```
