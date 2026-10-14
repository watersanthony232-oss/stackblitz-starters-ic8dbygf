import SwiftUI

// Simple Zone for iPhone. The app's screens are built into the phone (the `Web` folder, made from
// ../src by `npm run ios:native`), so it opens and works without the website.
// Business details come from the published "Simplezone live" sheet.
@main
struct SimpleZoneApp: App {
    var body: some Scene {
        WindowGroup {
            WebScreen()
                .background(Color("LaunchBackground").ignoresSafeArea())
        }
    }
}
