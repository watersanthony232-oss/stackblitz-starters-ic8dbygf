# Fillkin

*Sick of filling out forms? Fillkin does it for you.*

Fillkin, from Aurora Glance (part of Toz Industries): fill in your **Fillkin card** once, with a card for each of your children too, then tap **Enter with Fillkin** on a form and choose exactly what to share.

This is the **app prototype** (restored from the 4 October 2026 version):

- Welcome tour, and a lock screen with a 10-digit passcode or Face ID / fingerprint
- **Cards:** your card plus children's cards, with photo, colour, "% filled" and reminders to check them
- **Share:** pick which sections to share (no bank details: Fillkin never asks for or stores bank accounts)
- **Enter with Fillkin** demo on pretend websites (shop, school, doctor, car insurance), on this phone, on a laptop by QR code, or by tapping a reader
- **History** of what was shared, and **Settings** (locked backup, reminders, iPhone/Android style, text size)

It uses sample details only, and nothing is saved yet.

## Run

```sh
npm install
npm run dev      # dev server
npm run build    # production build into dist/
```

## iPhone app (iOS)

The `ios/` folder is a native Xcode project made with [Capacitor](https://capacitorjs.com). It wraps the same web page.

You need a Mac with Xcode (from the Mac App Store) and an [Apple Developer account](https://developer.apple.com/programs/) ($99/year) to put it on an iPhone or in the App Store.

### Run it in the iPhone simulator

```sh
cd fillkin
npm install
npm run ios          # builds the web app, copies it into ios/, and opens Xcode
```

In Xcode, pick an iPhone simulator at the top and press ▶ Run.

After changing any code in `src/`, run `npm run ios:sync` and press ▶ again.

### Put it on TestFlight / the App Store

1. In Xcode, click **App** in the left sidebar › **Signing & Capabilities** › choose your **Team** (your Apple Developer account).
   The bundle ID is `io.github.watersanthony232.fillkin` (set in `capacitor.config.ts`; change it there and in Xcode if you want another).
2. In [App Store Connect](https://appstoreconnect.apple.com) › **Apps** › **+** › New App, using that same bundle ID.
3. In Xcode, choose **Any iOS Device (arm64)** as the target, then **Product › Archive**.
4. When the Organizer window opens, click **Distribute App › App Store Connect › Upload**.
5. After it processes (~15 min), add testers under **TestFlight** in App Store Connect, or fill in the store listing (screenshots, description, privacy details) and **Submit for Review**.

For the App Store privacy questions: the prototype keeps everything on the device and doesn't collect accounts, tracking or analytics.

The app icon and launch screen are generated from `assets/` with `npx capacitor-assets generate --ios`.

### Automatic TestFlight uploads from GitHub

The **Fillkin TestFlight** workflow (`.github/workflows/fillkin-testflight.yml`) builds, signs and uploads the app for you. No Mac needed after setup.

One-time setup:

1. **Register the bundle ID** at [developer.apple.com/account](https://developer.apple.com/account) › Certificates, IDs & Profiles › Identifiers › **+** › App IDs › App. Choose *Explicit* and enter `io.github.watersanthony232.fillkin`.
2. **Create the app** in [App Store Connect](https://appstoreconnect.apple.com) › Apps › **+** › New App: platform iOS, name *Fillkin*, pick that bundle ID, any SKU (e.g. `fillkin`).
3. **Create an API key** in App Store Connect › Users and Access › Integrations › App Store Connect API › Team Keys › **+**. Give it the **Admin** role (needed so it can create the signing certificate). Download the `.p8` file (you can only download it once) and note the **Key ID** and the **Issuer ID** shown above the list.
4. **Find your Team ID** at developer.apple.com/account › Membership details (10 characters).
5. **Add four repository secrets** on GitHub › this repo › Settings › Secrets and variables › Actions › New repository secret:

   | Name | Value |
   |---|---|
   | `ASC_KEY_ID` | the Key ID |
   | `ASC_ISSUER_ID` | the Issuer ID |
   | `APPLE_TEAM_ID` | your Team ID |
   | `ASC_KEY_P8` | the whole contents of the `.p8` file, including the `BEGIN`/`END` lines |

Then go to **Actions › Fillkin TestFlight › Run workflow**. After about 15 minutes of processing the build shows up in App Store Connect › TestFlight, where you can add testers. Each run uses the next build number automatically.
