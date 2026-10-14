# Simple Zone

*Local first – less driving, more living.*

Simple Zone, from Aurora Glance (part of Toz Industries): a free local shopping app. Type what you need and it shows the nearest places that have it, whether they're open right now, and how to get there.

This is the **iPhone app**, made to look the same as the Simple Zone website and Android app (matched to the pitch video):

- Search "what do you need?", or tap a quick search (coffee, cider, haircut, phone charger…). Add a place to search there, like "deli Stockport".
- Pick an area or tap **Near me** for nearest first. Filters: **Open now**, **Open late**, **Open Sunday**, **Student discount**.
- Shop cards with open now / closes, distance, what they sell, offers and student discount.
- Shop page: Directions (Apple Maps), Call, WhatsApp, website, Facebook, what they sell, opening times.
- **My shopping list**: finds everything in the fewest stops.
- **Aa Normal text** button for bigger text.
- **Add your shop** with Free and Plus pricing, and **About**.

Shops are in `src/shops.ts`. The real ones joined through the "Join Simple Zone" form; shops marked `example` are pretend ones that show how a listing looks.

## Run

```sh
npm install
npm run dev      # in a browser
npm test         # opening hours, search and shopping list tests
npm run ios      # build, copy into the iPhone project and open Xcode (Mac only)
```

## iPhone build

- **Simple Zone iOS** (GitHub Actions) builds the app, runs it in an iPhone simulator and saves screenshots.
- **Simple Zone TestFlight** (run by hand from the Actions tab) uploads a build to TestFlight. It uses the same App Store Connect secrets as Fillkin. Create the app in App Store Connect first with the bundle ID `com.auroraglance.simplezone`.

## Brand

- `assets/sz-mark.svg`: the SZ mark as a vector (app icon and header)
- `assets/icon-only.png`: the 1024×1024 app icon made from it
- Teal `#04A4A2` (the S), navy `#0A2551` (the Z); app colours from the website: header teal `#0B5759`, orange `#C5530D`
