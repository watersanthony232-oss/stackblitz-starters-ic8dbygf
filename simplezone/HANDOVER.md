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

**Waiting on Tony**
1. Published CSV link for "Simplezone live".
2. Android look: screenshots or the Android project, or confirm the tab-bar design from the pitch video (Home / Offers / Loyalty / Alerts) is the Android app.
3. th2os modern font files (Thick, Medium, Thin).
4. How Zonie stamps get added (who stamps, and how the app knows the stamp is real).
5. The pitch video says "First 50 businesses: Plus free for 6 months", but the app says "free for your first year". Which is right?

**Next steps**
1. Restyle every screen (Home, areas/categories, search, business page, Zonie card wallet, About/Privacy) to match the Android look, in the new colours, with Dark Mode, Dynamic Type and VoiceOver labels.
2. Switch the app from the built-in list (`src/shops.ts`) to the sheet. Ask Tony before deleting the example businesses.
3. Change "shops" to "businesses" in all wording.
4. About/Privacy: link to auroraglance.com/simplezone/privacy and add "We never sell your data".
5. App icon in all sizes, launch screen, `PrivacyInfo.xcprivacy`, draft App Store privacy answers.
6. Zonie Ads: switched off.
7. Simulator screenshots via the "Simple Zone iOS" GitHub check: small and large iPhone, light and dark. Spelling check.
8. Final code check and tidy-up. Ask before deleting anything.
