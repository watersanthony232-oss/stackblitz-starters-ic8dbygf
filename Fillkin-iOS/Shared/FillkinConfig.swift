import Foundation

/// Identifiers and limits shared by the Fillkin app and the Fillkin keyboard.
enum FillkinConfig {
    /// App Group both targets belong to. The app writes here; the keyboard only reads
    /// (a keyboard without Full Access gets read-only access to the group container).
    static let appGroupID = "group.com.auroraglance.fillkin"

    /// How long the keyboard may show details after the app was last unlocked.
    static let keyboardUnlockWindow: TimeInterval = 10 * 60

    /// Length of the fallback PIN.
    static let pinLength = 10

    /// The Team ID prefix with its trailing dot (for example "ABCDE12345."),
    /// copied into Info.plist from $(AppIdentifierPrefix) at build time.
    static var appIdentifierPrefix: String {
        Bundle.main.object(forInfoDictionaryKey: "FillkinAppIdentifierPrefix") as? String ?? ""
    }

    /// Keychain access group shared by the app and the keyboard. Holds only the data key.
    static var sharedKeychainGroup: String {
        appIdentifierPrefix + "com.auroraglance.fillkin.shared"
    }

    /// The app's own keychain group (its app ID). The keyboard is not a member,
    /// so the PIN verifier and Face ID item stay out of the keyboard's reach.
    static var appOnlyKeychainGroup: String {
        appIdentifierPrefix + "com.auroraglance.fillkin"
    }
}
