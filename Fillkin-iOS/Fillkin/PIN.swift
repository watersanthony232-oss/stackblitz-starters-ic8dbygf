import CommonCrypto
import CryptoKit
import Foundation
import Security

/// A salted PBKDF2-SHA256 hash of the PIN. The PIN itself is never stored.
struct PinVerifier: Codable, Equatable {
    var salt: Data
    var hash: Data
    var iterations: Int

    static let defaultIterations = 600_000

    static func make(pin: String, iterations: Int = defaultIterations) throws -> PinVerifier {
        var salt = Data(count: 16)
        let status = salt.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 16, $0.baseAddress!) }
        guard status == errSecSuccess else { throw KeychainError.status(status) }
        return PinVerifier(salt: salt, hash: try derive(pin: pin, salt: salt, iterations: iterations),
                           iterations: iterations)
    }

    func matches(_ pin: String) -> Bool {
        guard let candidate = try? Self.derive(pin: pin, salt: salt, iterations: iterations) else { return false }
        return Self.constantTimeEqual(candidate, hash)
    }

    static func isWellFormed(_ pin: String) -> Bool {
        pin.count == FillkinConfig.pinLength && pin.allSatisfy(\.isASCIIDigit)
    }

    static func derive(pin: String, salt: Data, iterations: Int) throws -> Data {
        let password = Array(pin.utf8)
        var derived = [UInt8](repeating: 0, count: 32)
        let status = salt.withUnsafeBytes { saltBytes in
            CCKeyDerivationPBKDF(
                CCPBKDFAlgorithm(kCCPBKDF2),
                password.map { Int8(bitPattern: $0) }, password.count,
                saltBytes.bindMemory(to: UInt8.self).baseAddress, salt.count,
                CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(iterations),
                &derived, derived.count)
        }
        guard status == kCCSuccess else { throw KeychainError.status(OSStatus(status)) }
        return Data(derived)
    }

    private static func constantTimeEqual(_ a: Data, _ b: Data) -> Bool {
        guard a.count == b.count else { return false }
        var difference: UInt8 = 0
        for (x, y) in zip(a, b) { difference |= x ^ y }
        return difference == 0
    }
}

/// Wrong-PIN counting. After 5 wrong PINs in a row Fillkin makes you wait,
/// and each further wrong PIN makes the wait longer.
struct PinAttempts: Codable, Equatable {
    var failures = 0
    var lockedUntil: Date?

    static let freeAttempts = 5

    /// Wait after the given number of failures in a row.
    static func delay(afterFailures failures: Int) -> TimeInterval {
        switch failures {
        case ..<freeAttempts: return 0
        case freeAttempts: return 30
        case freeAttempts + 1: return 60
        case freeAttempts + 2: return 5 * 60
        case freeAttempts + 3: return 15 * 60
        default: return 60 * 60
        }
    }

    func waitRemaining(now: Date = Date()) -> TimeInterval {
        guard let lockedUntil else { return 0 }
        return max(0, lockedUntil.timeIntervalSince(now))
    }

    mutating func recordFailure(now: Date = Date()) {
        failures += 1
        let delay = Self.delay(afterFailures: failures)
        lockedUntil = delay > 0 ? now.addingTimeInterval(delay) : nil
    }

    mutating func reset() {
        failures = 0
        lockedUntil = nil
    }
}

/// PIN verifier and attempt counter, kept in the app's own keychain group (not the keyboard's).
enum PinStore {
    static let verifierAccount = "pin-verifier.v1"
    static let attemptsAccount = "pin-attempts.v1"

    static func loadVerifier() throws -> PinVerifier {
        let data = try Keychain.read(account: verifierAccount, group: FillkinConfig.appOnlyKeychainGroup)
        return try JSONDecoder().decode(PinVerifier.self, from: data)
    }

    static func saveVerifier(_ verifier: PinVerifier) throws {
        try Keychain.write(try JSONEncoder().encode(verifier), account: verifierAccount,
                           group: FillkinConfig.appOnlyKeychainGroup,
                           accessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
    }

    static func loadAttempts() -> PinAttempts {
        guard let data = try? Keychain.read(account: attemptsAccount, group: FillkinConfig.appOnlyKeychainGroup),
              let attempts = try? JSONDecoder().decode(PinAttempts.self, from: data) else { return PinAttempts() }
        return attempts
    }

    static func saveAttempts(_ attempts: PinAttempts) throws {
        try Keychain.write(try JSONEncoder().encode(attempts), account: attemptsAccount,
                           group: FillkinConfig.appOnlyKeychainGroup,
                           accessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
    }

    static func deleteAll() throws {
        try Keychain.delete(account: verifierAccount, group: FillkinConfig.appOnlyKeychainGroup)
        try Keychain.delete(account: attemptsAccount, group: FillkinConfig.appOnlyKeychainGroup)
    }
}
