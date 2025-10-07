# WENDROPS Mobile (Expo Wrapper)

This is a minimal Expo app that wraps the live WENDROPS site in a WebView for Android builds and Solana dApp Store submission.

## Prereqs
- Node 18+
- Expo CLI: `npm i -g expo-cli eas-cli`
- Android Studio + SDK

## Configure
- Base URL is set in `mobile/app.json > expo.extra.baseUrl` (defaults to `https://wendrops-airdrop.vercel.app/`).
- App ID: `mobile/app.json > expo.android.package` (change if needed).

## Run
```bash
cd mobile
npm install
npm run android # runs on connected device/emulator
```

## Build (APK/AAB)
```bash
cd mobile
npm install
# Login to EAS (Expo Application Services)
eas login
# Configure credentials (first time)
eas build:configure
# Build Android
npm run android:build
```
The build artifact (AAB/APK) will be available in the EAS dashboard.

## Store Submission
Use the generated APK/AAB to submit to the Solana dApp Store following their guide.
Reference: https://docs.solanamobile.com/dapp-publishing/intro
