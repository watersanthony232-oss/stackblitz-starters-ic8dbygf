# Simple Zone – draft App Store privacy answers

**DRAFT for Tony to check. Nothing has been entered in App Store Connect.**
These answers describe the iPhone app `SimpleZoneiOS` as built on 14 Oct 2026 (branch `claude/wonderful-mendel-9hc164`).
If the app changes (Zonie stamps, Zonie Ads, accounts, analytics), they must be redone.

## App Privacy (App Store Connect › App Privacy)

**Privacy Policy URL:** https://auroraglance.com/simplezone/privacy
- ⚠️ Check this page is live before submitting. It couldn't be opened from the build machine.

**"Do you or your third-party partners collect data from this app?"** → **No, we do not collect data from this app.**

Apple counts data as "collected" only when it leaves the phone and is kept longer than needed to answer the request. Why "No" is right for Simple Zone today:

| What the app touches | Leaves the phone? | Why it is not "collected" |
|---|---|---|
| Location (only when you tap **Near me**) | No | Used on the phone to sort businesses by distance. Never stored or sent. |
| Shopping list, chosen area, text size | No | Saved only on the phone. |
| Business list | Downloaded, not sent | The app downloads the published "Simplezone live" sheet. Nothing about the user is sent with it. |
| Call / WhatsApp / Maps / website buttons | Opens another app | Phone, WhatsApp, Maps and Safari have their own privacy policies. Simple Zone sends nothing. |

- No accounts, no sign-in, no analytics, no crash-reporting service, no adverts and no third-party SDKs: the app uses only Apple's own frameworks (SwiftUI, WebKit, Core Location).

**Data Used to Track You:** none. **Data Linked to You:** none. **Data Not Linked to You:** none.

> ⚠️ One thing to decide: the business list comes from Google (published Google Sheet). Like any web request, Google's servers see the phone's IP address when the list is downloaded. Apple's guidance treats this kind of hosting request as not "collection" by the app, so the answer above stays **No**. If you'd rather not rely on Google, the list could be hosted on auroraglance.com instead.

## Tracking (App Tracking Transparency)

- **Does the app track users?** No.
- The app never shows the "Allow tracking?" prompt, has no tracking domains, and `NSPrivacyTracking` is `false`.

## Privacy manifest (`SimpleZoneiOS/SimpleZone/PrivacyInfo.xcprivacy`)

- `NSPrivacyTracking`: false
- `NSPrivacyTrackingDomains`: none
- `NSPrivacyCollectedDataTypes`: none
- `NSPrivacyAccessedAPITypes`: none
  - The app uses no "required reason" APIs and no third-party code.

## Permission prompt the user sees

**Location (When In Use):** "Shows the nearest businesses first when you tap Near me. Your location stays on your phone."

## Other App Store Connect answers

- **Encryption:** the app uses no encryption of its own (`ITSAppUsesNonExemptEncryption` = NO). Standard HTTPS only.
- **Paid APIs / third-party tracking:** none.
- **Zonie Ads:** switched off in the app (`ZONIE_ADS_ENABLED = false`). If ads go live later, these answers and the privacy policy must change first.

## Before you submit (for Tony)

1. Check https://auroraglance.com/simplezone/privacy is live and says the same as above, including "We never sell your data".
2. Confirm the "Simplezone live" sheet holds only details businesses agreed to publish. The app never shows emails, but the published sheet itself is public.
3. Say "yes" before anything is uploaded. Nothing has been sent to App Store Connect or TestFlight.
