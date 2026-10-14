# Simple Zone iPhone app – handover

Simple Zone only. Kept separate from Fillkin and every other project in this repo.
Branch: `claude/wonderful-mendel-9hc164`.

---

## Chunk 1 – 14 Oct 2026, 02:13–02:17 UTC

**Found**
- There was no HANDOVER file and no style notes, so "new style" = Tony's brief: teal `#0F5E63`, orange `#D35F1A`, th2os modern font, calm and clean, Dark Mode, Dynamic Type, VoiceOver.
- The Simple Zone iPhone app was only on the unmerged branch `claude/blissful-ritchie-h3zmvh`. Merged it into this branch (no conflicts, nothing outside `simplezone/` and its two workflows).
- "Simplezone live" sheet is in Tony's Drive. Columns: Name, Area, Category, What they sell, Opening hours, Whatsapp, Phone, Website, Plus. 1 row (Aurora Glance).
- Pitch video (sent by Tony) shows the Zonie loyalty card: "Your loyalty cards", one card per business, 10 stamps, "Show my code to stamp", "One card for every shop on Simple Zone", "Each shop picks its reward".
- Android app source is not in this repo, the "Tony" repo (empty) or Drive. The website and auroraglance.com can't be reached from the build machine.

**Done**
- `src/sheet.ts`: loads the sheet's published CSV. Ignores email columns and removes anything that looks like an email. Bad rows are skipped, not a crash. Keeps the last good copy on the phone for when there's no internet. Waits on `SHEET_CSV_URL` (empty until Tony sends the "Publish to web" CSV link).
- `src/hours.ts`: `parseHours` reads hours typed in the sheet ("Mon-Fri 9am-5pm, Sat 10-4, Sun closed"). If any part is unclear it shows the text as typed and never claims "open now".
- `src/areas.ts`: "Southampton" in the sheet = Southampton City Centre. An unknown area gets no distance (never a made-up one).
- `src/search.ts`: copes with businesses that have no location or hours.
- `src/sheet.test.ts`: 13 new tests. 23 tests pass in total.

**Installed / removed**
- Nothing installed or removed. (`npm ci` run for the existing packages.)

## Chunk 2 – 14 Oct 2026, 02:18–02:25 UTC

Tony said "go": look (a) from the pitch video (white top bar, tabs along the bottom).

**Done**
- Every screen restyled (`src/main.ts`, `src/style.css`): teal `#0F5E63`, orange `#D35F1A`, white space, 20px margin all round.
  - **Tabs:** Home, Search, Zonie, About. The video's Offers and Alerts tabs are left out: the sheet has no offers, and alerts need a server.
  - **Home:** tagline, search, area chips (Near me / All areas / areas with businesses / More areas…), category chips, business cards, "Own a business?" box.
  - **Search:** quick searches, Near me, Open now, Open late, Open Sunday, shopping list. The Student discount filter is gone because the sheet has no student discount column.
  - **Business page:** teal header, orange Call button (or WhatsApp, or Website), today's hours, WhatsApp, website, "Find in Maps", what they sell, opening times.
  - **Zonie card wallet:** "Your Zonie cards", an empty 10-stamp card, "Coming soon", "Why people love Zonie" (wording from the video).
  - **About:** spinning SZ logo, tagline, "We never sell your data.", link to https://auroraglance.com/simplezone/privacy.
  - **Pricing page:** reached from "Add your business".
- **Launch:** the SZ logo spins gently while the businesses load (at least 1.2 s), then fades.
- **Moving parts:** cards fade and slide in softly. Everything stops if "Reduce Motion" is on.
- **Dark Mode:** follows the iPhone setting.
- **Dynamic Type:** text follows iPhone Settings › Text Size. The Aa button still makes it bigger on top of that.
- **VoiceOver:** labels on every button and icon. It moves to each screen's heading, the opening-times table has row headings, and the tabs show which one is selected.
- **Font:** "th2os modern" is first in the font list, with the iPhone's own font until the files arrive. Thick = 700, Medium = 500, Thin = 300. The app no longer loads Roboto.
- **Accessibility contrast:** white on `#D35F1A` is only 3.87:1, so orange buttons use large bold text, and small orange text uses `#B9500F` (4.98:1).
- **Wording:** "shops" changed to "businesses" in the app, the location prompt (Info.plist), privacy.html and support.html.
- **Settings:** `src/config.ts` holds the privacy link and tagline, plus `ZONIE_ADS_ENABLED = false` and `ZONIE_STAMPS_LIVE = false`.
- **Checked in Chromium** at iPhone SE (375×667) and iPhone Pro Max (430×932) sizes, light and dark, all 7 screens: no errors. This is not yet the real iPhone Simulator.

**Installed / removed**
- Nothing installed. Roboto (`@fontsource/roboto`) is no longer used but is still installed. I'll ask before removing it.

## Chunk 3 – 14 Oct 2026, 02:30–02:34 UTC

No reply after chunk 2, so I carried on as agreed.

**Done**
- **App icon in all iPhone sizes:** 40, 58, 60, 80, 87, 120, 180 px, plus the 1024 px App Store icon. All made from the existing SZ icon, with no transparency (Apple rejects icons with see-through parts).
- **Launch screen:** the SZ logo on a white tile, centred, on white in light mode and `#0F1517` in dark mode.
  - The old dark launch image was a copy of the white one, so dark mode flashed white.
  - The app's own spinning-logo launch screen now matches it exactly (160 pt, centred), so nothing jumps when the app takes over.
  - The web page background is set to dark straight away in dark mode, so there's no white flash.
- **`PrivacyInfo.xcprivacy`:** no tracking, no tracking domains, no data collected, no "required reason" APIs. Added to the Xcode project.
- **`APP-STORE-PRIVACY.md`:** draft App Store privacy answers for Tony to check (answer: "No, we do not collect data").
- **"Simple Zone iOS" GitHub check now:**
  - builds a special version with a screenshot tour (sample businesses, steps through every screen);
  - screenshots launch, Home, Search, business page, Zonie, About and Pricing;
  - does this on a small iPhone (SE) and a large one (Pro Max), in light and dark;
  - fails if a screen never shows or the app stops running.
  The tour is in `src/tour.ts`. It is left out of the real app: the normal build was checked and has no tour code. The TestFlight workflow doesn't build it. Nothing was uploaded and TestFlight wasn't touched.

**Installed / removed**
- Nothing installed or removed.
- New files: `ios/App/App/PrivacyInfo.xcprivacy`, `Assets.xcassets/LaunchLogo.imageset`, `Assets.xcassets/LaunchBackground.colorset`, 8 icon sizes, `src/tour.ts`, `APP-STORE-PRIVACY.md`.
- `Assets.xcassets/Splash.imageset` is no longer used. I'll ask before deleting it.

**Waiting on Tony** (still open after chunk 3)
1. Published CSV link for "Simplezone live".
2. Android look: screenshots or the Android project, or confirm the tab-bar design from the pitch video (Home / Offers / Loyalty / Alerts) is the Android app.
3. th2os modern font files (Thick, Medium, Thin).
4. How Zonie stamps get added (who stamps, and how the app knows the stamp is real).
5. The pitch video says "First 50 businesses: Plus free for 6 months", but the app says "free for your first year". Which is right?

**Next steps**
1. Check the "Simple Zone iOS" GitHub run: all screens on small and large iPhones, light and dark, and fix anything that looks wrong.
2. Spelling check of every word in the app.
3. Plug in the sheet link and font files when Tony sends them.
4. Final code check and tidy-up. Ask before deleting: the example businesses in `src/shops.ts` (now only used by tests), `@fontsource/roboto`, `public/privacy.html` (the app links to the website one now), `Splash.imageset`, and the README's old wording.
