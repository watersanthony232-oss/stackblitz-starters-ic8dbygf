# Simple Zone – getting ready to publish (version 1.0)

**Nothing is uploaded or submitted without Tony's clear "yes".**
- Both upload workflows only run by hand, and only after you type `yes`.
- Neither one ever submits for App Review.

## Ready (done by Claude)
- **iPhone app** (`SimpleZoneiOS`): builds and passes the GitHub iPhone Simulator check (small and large phones, light and dark).
- **Live business list:** comes from the published "Simplezone live" sheet.
- **Version 1.0:** no Zonie, no prices in the app (Apple-safe).
- **App icon:** 1024 px (Xcode makes the other sizes). Launch screen, privacy manifest, location prompt wording.
- **Shared Xcode scheme "SimpleZone":** so Xcode and GitHub build it the same way.
- **App Store words** in `fastlane/metadata`:
  - name, subtitle, promotional text, description, keywords;
  - categories (Shopping, Lifestyle), copyright;
  - review notes for Apple.
- **Draft privacy answers:** `APP-STORE-PRIVACY.md`. The answer is "No, we do not collect data".
- **Workflows:**
  - `.github/workflows/simplezone-testflight.yml`: builds, signs and uploads to TestFlight.
  - `.github/workflows/simplezone-store-listing.yml`: sends the words and screenshots. It refuses to run while anything says TODO.

## To do (Tony)
1. **Add more real businesses to the sheet.** With only one, Apple may reject the app for doing too little.
2. **Check the privacy page is live:** https://auroraglance.com/simplezone/privacy (it must say "We never sell your data").
3. **Support page address:** replace `TODO-SUPPORT-URL` in `fastlane/metadata/en-GB/support_url.txt`, or tell Claude the address.
4. ~~**Contact email for Apple's reviewers**~~ Done 26 Oct 2026: hello@auroraglance.com (Tony's choice).
5. **Create the app in App Store Connect:**
   1. Go to appstoreconnect.apple.com › Apps › **+** › New App.
   2. Choose iOS, name "Simple Zone", language English (UK).
   3. Bundle ID **com.auroraglance.simplezone** (register it under Certificates, IDs & Profiles first if it isn't listed).
   4. SKU: `simplezone`.
6. **Age rating:** answer "None" to every question. Simple Zone has no violence, no unrestricted web browsing inside the app (links open Safari) and no user chat, so it should come out as 4+.
7. **Privacy answers:** enter the answers from `APP-STORE-PRIVACY.md` in App Store Connect › App Privacy.
8. **Put this work on GitHub's main branch** (Claude can open a pull request when you say so). GitHub only shows "Run workflow" for workflows on the main branch.
9. **Say "yes, upload to TestFlight".** Claude then guides you through running the workflow and testing on your iPhone.
10. **App Store screenshots:** Claude makes them from the Simulator once the real businesses are in the sheet, so they show real listings.
11. **When you're happy with TestFlight:** run the store listing workflow, then press **Submit for Review** in App Store Connect yourself.
