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
