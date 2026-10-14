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

## Chunk 4 – 14 Oct 2026, 02:36–02:38 UTC

**Simulator check**
- Run 6 failed before any screenshots: the GitHub Mac (Xcode 26.6, iOS 26.5) has no iPhone SE simulator, and the old SE model can't run iOS 26. The app itself built fine.
- Fixed: the check now picks only models the installed iOS supports.
  - Small: SE, else the "e" model, else mini, else the standard iPhone.
  - Large: Pro Max, else Plus.
- Run 7 (the fix) was still running at the end of this chunk.

**Spelling**
- Every word the app shows, including VoiceOver labels and search hints, plus privacy.html, support.html, the location prompt, APP-STORE-PRIVACY.md and this file, went through a spell checker.
- No spelling mistakes. Everything it flagged was a place name, a brand or tech term, or a correct British spelling ("centre").
- I also read every line of the app's text. Fixed:
  - VoiceOver read "Test CafePLUS" with no space. Now "Test Cafe PLUS".
  - The Zonie card's VoiceOver label said "Example Zonie card" while the screen says "Your card". Now "Your Zonie card: 0 of 10 stamps".
  - Search's "nothing found" hint said to pick "All areas", but that's on Home, not Search. It now says "choose All areas on Home", and only when an area is chosen.

**Installed / removed**
- `pyspellchecker`, installed in a throwaway folder outside the project (not part of the app). Nothing else.

## Decision – 14 Oct 2026, 02:45 UTC

**Tony: the real Simple Zone iPhone project is the 03:02 zip copy** (`SimpleZoneiOS/SimpleZone.xcodeproj`, from "Simple Zone iPhone app (Xcode, new SZ icon) 20261014-0302.zip" in OneDrive › Simple Zone). It is not in this repo or Google Drive.

- **This repo's copy** (`simplezone/`, Capacitor, scheme `App`) is on hold. Nothing has been deleted.
  - Its work (sheet loader, opening hours, new style, launch screen, privacy manifest, App Store privacy draft) can be moved across once I can see the zip copy.
- **Both copies use the app ID `com.auroraglance.simplezone`,** so installing one replaces the other on the Simulator. That explains the wrong icon.
- **Repo icon:** teal S and navy Z on white, md5 `082c8ce5ce4dedb99dcbd8d2c841d7c9`. Tony's expected icon-1024.png is md5 `91E74B4069BA2BF9F36B93118B84C8D8`, so they are different files.
- **"Simple Zone iOS" run 8 passed:** on a small and a large iPhone simulator (exact models not shown in the part of the log I could read), light and dark, every screen showed and the app kept running (28 screenshots). The screenshots couldn't be downloaded from the build machine; they're on the run's GitHub page.

**Next steps**
1. Tony uploads the 03:02 zip here (or to Google Drive) so I can see the real project.
2. Compare it with the repo copy and list what's missing, before changing anything.
3. Move the agreed work into the real project.

## The real project (03:02 zip) – checked 14 Oct 2026, 03:23 UTC

Tony emailed the zip to himself at 03:22 UTC. I copied it into a scratch folder outside this repo (not added to the repo).

**What it is:** 7 files, a tiny SwiftUI app (`SimpleZoneiOS/SimpleZone.xcodeproj`, scheme/product "Simple Zone", bundle ID `com.auroraglance.simplezone`, iOS 15+, iPhone only).
- It shows the **live website https://simplezone.auroraglance.com** full screen, plus a "You're offline / Try again" screen, pull-to-refresh and swipe-back.
- Links to Maps, phone, WhatsApp and email open in their own apps.
- **So the app's look comes from the website.** The new style, the moving logo, the business list and About/Privacy all have to be done on the website.
- The website's source code is not in this repo, and the site can't be reached from the build machine.

**Checked:**
- `icon-1024.png` md5 is `91e74b4069ba2bf9f36b93118b84c8d8`, the same as Tony's `91E74B40…`. It's a teal S and navy Z on white, 1024×1024, a single size (Xcode makes the other sizes).

**Things that clash with Tony's brief:**
1. **Wording:** the offline text says "find local shops", and the location prompt says "nearest shops". Both should say "businesses".
2. **Zonie Ads:** the app asks for camera and photo access "for a free Zonie Ad", but Zonie Ads are meant to stay switched off.
3. **Colour:** teal `#037F7D` ("new SZ colours, 13 Oct") vs the brief's `#0F5E63`.
4. **App Store readiness:** no `PrivacyInfo.xcprivacy`, and the launch screen is Xcode's automatic one (blank).
5. **Separation from Fillkin:** Tony's Mac instructions build it on the "Fillkin UI Test" simulator.

**Next steps**
1. Tony decides:
   - **A)** keep the app showing the website, and update the website (I'll need its source code); or
   - **B)** build the repo's new-style screens into this Xcode project, so the app works without the website.
2. Fix 1–5 above once Tony says which way to go.

## Chunk 6 – 14 Oct 2026, 03:24–03:27 UTC: option B (the real project runs the app built in)

Tony chose **B**: the real Xcode project (`SimpleZoneiOS`, from the 03:02 zip) now runs the new-style app itself, not the website.

**Done**
- **Added to the repo:** the zip project at `simplezone/SimpleZoneiOS/`, first exactly as it was (commit `d521d93`), then changed (commit `eed4ba2`).
- **`WebScreen.swift`:**
  - Shows the app's own screens from `SimpleZone/Web`, served at `simplezone://app/…`. It no longer loads simplezone.auroraglance.com.
  - The phone fetches the "Simplezone live" sheet itself, from docs.google.com only.
  - "Near me" uses the phone's location service. The location stays on the phone.
  - Calls, WhatsApp, Maps, email and websites open in their own apps.
  - If iOS clears the screen to save memory, the app loads it again instead of showing a blank page.
  - The old "You're offline" screen is gone: the app now handles no internet itself, by showing the saved list or a "Can't reach Simple Zone – Try again" message.
- **`SimpleZone/Web`:** made by `npm run ios:native`, which builds `src/` and copies it in. Run it again after any change to `src/`.
- **Launch screen:** `LaunchScreen.storyboard` plus the `LaunchLogo` and `LaunchBackground` assets (white, or `#0F1517` in dark mode).
- **`PrivacyInfo.xcprivacy`:** added to the project.
- **Info.plist:**
  - Location prompt now says "businesses".
  - Camera and photo prompts ("for a free Zonie Ad") removed, because Zonie Ads stay off.
  - "Uses no encryption" set to NO.
- **"Simple Zone iOS" check:** now builds and photographs `SimpleZoneiOS`, not the Capacitor copy.

**Not changed (Tony to decide)**
- `AccentColor` is still `#037F7D` (zip, "new SZ colours 13 Oct"). The screens use the brief's `#0F5E63`. Which is right?
- The icon is unchanged (Tony's new SZ icon, a single 1024 px image; Xcode makes the other sizes).
- The **TestFlight workflow still points at the old Capacitor copy.** It has never been run and must not be used until it's pointed at `SimpleZoneiOS`.

**Installed / removed**
- Nothing installed. Removed from the real project: the camera and photo permission prompts, and loading the live website.

## Old-style Simple Zone deleted – 14 Oct 2026, 03:31 UTC

Tony: "delete all existence of old style sz".

**Removed from the repo (this branch)**
- `simplezone/ios/`: the old Capacitor iPhone copy, including its old icon set and splash images.
- `simplezone/capacitor.config.ts`, and the Capacitor packages (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`).
- `@fontsource/roboto`: the old font.
- `simplezone/src/shops.ts`: the old built-in business list, including the 6 pretend "example" businesses and Holistic Directions. Businesses now come only from the sheet.
  - The tests use made-up "Test …" businesses in the sheet layout instead.
- `simplezone/public/privacy.html` and `support.html`: old-style pages. The app links to https://auroraglance.com/simplezone/privacy instead.
- `simplezone/assets/icon-only.png`: the old Capacitor icon source.
- `.github/workflows/simplezone-testflight.yml`: it uploaded the old copy. A new one would be made only when Tony says yes to TestFlight.
- README rewritten for the new app. The "Student discount" filter code is gone (no student discount column in the sheet).

**Kept**
- `SimpleZoneiOS/` (the real app).
- `src/` (the new screens).
- `assets/sz-mark.svg` / `.jpg` (the SZ logo).
- `public/favicon.svg`.
- `HANDOVER.md` (history).

**Still exists elsewhere (not deleted; Tony to say)**
1. **Git history:** older commits on this branch still contain the old files, as every history does. Removing them would mean rewriting history.
2. **The GitHub branch `claude/blissful-ritchie-h3zmvh`:** the old-style app before today's work. I can delete it on Tony's yes.
3. **Tony's Mac and OneDrive:** older SimpleZone copies (the ones with the orange-pin icon). Only Tony can delete those.

**Tony's answers (03:33 UTC): 1 yes, 2 no, 3 ok.**
1. **Old branch:** I checked that every commit on `claude/blissful-ritchie-h3zmvh` is already in this branch's history, then tried to delete it. GitHub refused: this session can only push to its own branch. Tony can delete it at https://github.com/watersanthony232-oss/stackblitz-starters-ic8dbygf/branches (bin icon next to the branch).
2. **Git history:** left as it is.
3. **Mac and OneDrive copies:** Tony will handle them.

**Installed / removed**
- Removed: the 3 Capacitor packages and Roboto (`npm uninstall`). Nothing installed.

## Real app tested and sent – 14 Oct 2026, 03:45 UTC

- **"Simple Zone iOS" run 14** (commit `eed4ba2`) **passed**: SimpleZoneiOS built, and on a small and a large iPhone simulator, light and dark, every screen showed within seconds and the app kept running.
- **Run 16** (commit `78276e0`, old style deleted, same SimpleZoneiOS as now) **passed** too.
- **Sent to Tony:** "Simple Zone iPhone app (Xcode, new style) 20261014-0336UTC.zip" (71 KB, `SimpleZoneiOS/` at the top, made from the commit). icon-1024.png md5 is still `91e74b40…`.
- Nothing uploaded to TestFlight or the App Store.

## Top-bar logo fixed – 14 Oct 2026, 05:24 UTC

Tony ran the new app: "old logo then new then old at the top in wrong colours".
- **The top bar showed a teal map pin with an orange dot** (copied from the pitch video's Android screens), and "Simple" in teal and "Zone" in orange. That's the old pin logo.
  - Now: the SZ logo in its own colours (teal `#04A4A2`, navy `#0A2551`) on a small white tile, so it shows in Dark Mode too, with "Simple Zone" next to it.
  - The pin logo is gone from the app.
  - Zonie stamps use a tick instead of a pin.
- Checked in Chromium, light and dark. `SimpleZone/Web` rebuilt (no tour code).
- **Still to find out:** what the first "old logo" at launch is.
  - The launch screen shows the same SZ logo on a white tile.
  - If Tony sees an orange pin there, it's iOS showing a saved picture of the old app's launch screen. Fix: Simulator › Device › Restart, then run again.

**Waiting on Tony** (still open after chunk 4)
1. Published CSV link for "Simplezone live".
2. Android look: screenshots or the Android project, or confirm the tab-bar design from the pitch video (Home / Offers / Loyalty / Alerts) is the Android app.
3. th2os modern font files (Thick, Medium, Thin).
4. How Zonie stamps get added (who stamps, and how the app knows the stamp is real).
5. ~~Launch offer~~ Answered 02:46 UTC 14 Oct: **first year free** ("First 50 businesses: Plus free for your first year"). The repo copy already says this; the pitch video's "6 months" is out of date. Check the zip copy says the same.

**Next steps**
1. Check the "Simple Zone iOS" GitHub runs 7 and 8 (screenshots of every screen on small and large iPhones, light and dark) and fix anything that looks wrong.
2. Plug in the sheet link and font files when Tony sends them.
3. Final code check and tidy-up. Ask before deleting: the example businesses in `src/shops.ts` (now only used by tests), `@fontsource/roboto`, `public/privacy.html` (the app links to the website one now), `Splash.imageset`, and the README's old wording.
