# Fillkin

Find nearby **fuel stations** and **EV chargers**, see them on a map, and keep track of prices.

- **Near me** (browser geolocation) or search any town, postcode or address
- Toggle between ⛽ Fuel and ⚡ EV charging
- Filter by radius (miles or km) and fuel type (petrol, diesel, LPG, E85)
- EV chargers show connector types (CCS, CHAdeMO, Type 2, …), counts and max power
- Opening hours, brand/operator, address, one-tap directions
- ★ Favourites, and price reports you enter yourself, sortable by cheapest
  (saved in your browser's localStorage and dropped after 14 days)

Station data comes from OpenStreetMap via the free Overpass API; place search uses Nominatim. No API keys are needed.

## Run

```sh
npm install
npm run dev      # dev server
npm test         # unit tests
npm run build    # type-check + production build into dist/
```

## iPhone app (iOS)

The `ios/` folder is a native Xcode project made with [Capacitor](https://capacitorjs.com). It wraps the same web code, with native location and Apple Maps directions.

You need a Mac with Xcode (from the Mac App Store) and an [Apple Developer account](https://developer.apple.com/programs/) ($99/year) to put it on an iPhone or in the App Store.

### Run it in the iPhone simulator

```sh
cd fillkin
npm install
npm run ios          # builds the web app, copies it into ios/, and opens Xcode
```

In Xcode, pick an iPhone simulator at the top and press ▶ Run. To fake a location in the simulator: **Features › Location › Custom Location…**

After changing any code in `src/`, run `npm run ios:sync` and press ▶ again.

### Put it on TestFlight / the App Store

1. In Xcode, click **App** in the left sidebar › **Signing & Capabilities** › choose your **Team** (your Apple Developer account).
   The bundle ID is `io.github.watersanthony232.fillkin` (set in `capacitor.config.ts`; change it there and in Xcode if you want another).
2. In [App Store Connect](https://appstoreconnect.apple.com) › **Apps** › **+** › New App, using that same bundle ID.
3. In Xcode, choose **Any iOS Device (arm64)** as the target, then **Product › Archive**.
4. When the Organizer window opens, click **Distribute App › App Store Connect › Upload**.
5. After it processes (~15 min), add testers under **TestFlight** in App Store Connect, or fill in the store listing (screenshots, description, privacy details) and **Submit for Review**.

For the App Store privacy questions: Fillkin uses location only on the device to search for nearby stations, sends the search area to OpenStreetMap servers, and doesn't collect accounts, tracking or analytics.

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
