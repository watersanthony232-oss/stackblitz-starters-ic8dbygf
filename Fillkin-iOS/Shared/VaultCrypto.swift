import CryptoKit
import Foundation

enum VaultCryptoError: Error {
    case sealFailed
    case badKey
}

/// AES-GCM (256-bit key) encryption for everything Fillkin writes to disk.
/// Each kind of file is bound to its own label (authenticated data), so one file
/// can't be swapped in for another.
enum VaultCrypto {
    enum Purpose: String {
        case vault = "fillkin.vault.v1"
        case unlockStamp = "fillkin.unlock.v1"

        var authenticatedData: Data { Data(rawValue.utf8) }
    }

    static let keyByteCount = 32

    static func seal(_ plaintext: Data, key: SymmetricKey, purpose: Purpose) throws -> Data {
        let box = try AES.GCM.seal(plaintext, using: key, authenticating: purpose.authenticatedData)
        guard let combined = box.combined else { throw VaultCryptoError.sealFailed }
        return combined
    }

    static func open(_ combined: Data, key: SymmetricKey, purpose: Purpose) throws -> Data {
        let box = try AES.GCM.SealedBox(combined: combined)
        return try AES.GCM.open(box, using: key, authenticating: purpose.authenticatedData)
    }

    static func makeKey() -> SymmetricKey {
        SymmetricKey(size: .bits256)
    }

    static func key(from data: Data) throws -> SymmetricKey {
        guard data.count == keyByteCount else { throw VaultCryptoError.badKey }
        return SymmetricKey(data: data)
    }

    static func data(from key: SymmetricKey) -> Data {
        key.withUnsafeBytes { Data($0) }
    }
}

/// The data key lives in the keychain group shared with the keyboard.
/// It is only readable while the iPhone is unlocked, and never leaves this device
/// (not in iCloud Keychain, not in backups).
enum DataKeyStore {
    static let account = "data-key.v1"

    static func load() throws -> SymmetricKey {
        let data = try Keychain.read(account: account, group: FillkinConfig.sharedKeychainGroup)
        return try VaultCrypto.key(from: data)
    }

    static func create() throws -> SymmetricKey {
        let key = VaultCrypto.makeKey()
        try Keychain.write(
            VaultCrypto.data(from: key),
            account: account,
            group: FillkinConfig.sharedKeychainGroup,
            accessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        )
        return key
    }

    static func delete() throws {
        try Keychain.delete(account: account, group: FillkinConfig.sharedKeychainGroup)
    }
}
