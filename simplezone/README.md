# Simple Zone

*Local first – less driving, more living.*

Simple Zone, from Aurora Glance (part of Toz Industries): a free local app. Type what you need and it shows the nearest businesses that have it, whether they're open now, and how to get in touch.

## What's here

- `SimpleZoneiOS/`: **the iPhone app** (open `SimpleZone.xcodeproj` in Xcode, scheme "SimpleZone").
  - Its screens are built in (`SimpleZone/Web`), so it opens without the website.
- `src/`: the app's screens.
  - Home, Search, business page, Zonie card wallet, About/Privacy.
  - The style: teal `#0F5E63`, orange `#D35F1A`, Dark Mode, bigger text, VoiceOver.
- **Business details** come only from the published "Simplezone live" Google Sheet, public details only. Set the link in `src/sheet.ts` (`SHEET_CSV_URL`).
- `HANDOVER.md`: where the work is up to.
- `APP-STORE-PRIVACY.md`: draft App Store privacy answers.

## Run

```sh
npm install
npm run dev         # the screens in a browser
npm test            # opening hours, sheet and search tests
npm run ios:native  # build the screens into SimpleZoneiOS/SimpleZone/Web (run after any change to src/)
```

Then open `SimpleZoneiOS/SimpleZone.xcodeproj` in Xcode and press Play.

## Checks

- **Simple Zone iOS** (GitHub Actions) builds the iPhone app on a Mac and photographs every screen on a small and a large iPhone, in light and dark.
- Nothing is uploaded to TestFlight or the App Store from this repo.
