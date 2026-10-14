import Foundation
import LocalAuthentication
import Security

/// Face ID / Touch ID unlock.
///
/// Turning it on stores a random item that only the current set of enrolled faces or
/// fingerprints can read (`.biometryCurrentSet`). Unlocking reads that item, so the
/// Secure Enclave decides. If someone adds a face or fingerprint, iOS deletes the item
/// and Fillkin asks for the PIN until Face ID is turned on again.
enum Biometrics {
    static let gateAccount = "biometric-gate.v1"
    /// Remembers that the person turned biometrics on, so a missing gate item
    /// can be told apart from "never turned on".
    static let enabledAccount = "biometrics-enabled.v1"

    static var isEnabled: Bool {
        (try? Keychain.read(account: enabledAccount, group: FillkinConfig.appOnlyKeychainGroup)) != nil
    }

    enum Kind {
        case faceID, touchID, opticID

        var name: String {
            switch self {
            case .faceID: return "Face ID"
            case .touchID: return "Touch ID"
            case .opticID: return "Optic ID"
            }
        }
    }

    enum Outcome {
        case success
        /// Enrolled faces or fingerprints changed; the PIN is needed.
        case enrollmentChanged
        /// Cancelled, failed, or "Use PIN" tapped.
        case usePIN
    }

    /// Nil if this iPhone has no biometrics set up.
    static func availableKind() -> Kind? {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else { return nil }
        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        default: return nil
        }
    }

    static func enable() throws {
        var error: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, &error) else {
            throw KeychainError.accessControl
        }
        var token = Data(count: 32)
        let status = token.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 32, $0.baseAddress!) }
        guard status == errSecSuccess else { throw KeychainError.status(status) }
        try Keychain.write(token, account: gateAccount, group: FillkinConfig.appOnlyKeychainGroup, accessControl: access)
        try Keychain.write(Data([1]), account: enabledAccount, group: FillkinConfig.appOnlyKeychainGroup,
                           accessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
    }

    static func disable() {
        try? Keychain.delete(account: gateAccount, group: FillkinConfig.appOnlyKeychainGroup)
        try? Keychain.delete(account: enabledAccount, group: FillkinConfig.appOnlyKeychainGroup)
    }

    /// Shows the Face ID / Touch ID prompt by reading the protected item.
    static func authenticate() async -> Outcome {
        await Task.detached(priority: .userInitiated) {
            let context = LAContext()
            context.localizedReason = "Unlock Fillkin"
            context.localizedFallbackTitle = "Use PIN"
            do {
                _ = try Keychain.read(account: gateAccount, group: FillkinConfig.appOnlyKeychainGroup, context: context)
                return Outcome.success
            } catch KeychainError.notFound {
                return Outcome.enrollmentChanged
            } catch {
                return Outcome.usePIN
            }
        }.value
    }
}
