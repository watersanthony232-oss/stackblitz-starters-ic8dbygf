import SwiftUI

// Simple Zone for iPhone: shows https://simplezone.auroraglance.com full screen.
// Website updates appear in the app straight away - the app only needs rebuilding for name/icon changes.
@main
struct SimpleZoneApp: App {
    var body: some Scene {
        WindowGroup {
            WebScreen()
                .background(SZ.background.ignoresSafeArea())
        }
    }
}

enum SZ {
    static let home = URL(string: "https://simplezone.auroraglance.com/?source=ios")!
    static let host = "simplezone.auroraglance.com"
    static let teal = Color(red: 3 / 255, green: 127 / 255, blue: 125 / 255)         // #037F7D deep teal (new SZ colours, 13 Oct 2026)
    static let background = Color(red: 245 / 255, green: 247 / 255, blue: 250 / 255) // #F5F7FA, same as the website
}
