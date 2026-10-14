import CryptoKit
import Foundation

enum SharedStoreError: Error {
    case noAppGroupContainer
}

/// Encrypted files in the App Group container.
/// The app reads and writes them; the keyboard only reads them.
struct SharedStore {
    let directory: URL

    init(directory: URL) {
        self.directory = directory
    }

    static func appGroup() throws -> SharedStore {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: FillkinConfig.appGroupID) else {
            throw SharedStoreError.noAppGroupContainer
        }
        return SharedStore(directory: container.appendingPathComponent("Fillkin", isDirectory: true))
    }

    var vaultURL: URL { directory.appendingPathComponent("vault.bin") }
    var unlockStampURL: URL { directory.appendingPathComponent("unlock.bin") }

    // MARK: Vault

    /// Nil if nothing has been saved yet.
    func loadVault(key: SymmetricKey) throws -> VaultContents? {
        guard let sealed = try readIfPresent(vaultURL) else { return nil }
        let json = try VaultCrypto.open(sealed, key: key, purpose: .vault)
        return try JSONDecoder().decode(VaultContents.self, from: json)
    }

    func saveVault(_ contents: VaultContents, key: SymmetricKey) throws {
        let json = try JSONEncoder().encode(contents)
        try writeProtected(try VaultCrypto.seal(json, key: key, purpose: .vault), to: vaultURL)
    }

    var hasVault: Bool { FileManager.default.fileExists(atPath: vaultURL.path) }

    // MARK: Unlock stamp

    func loadUnlockStamp(key: SymmetricKey) throws -> UnlockStamp? {
        guard let sealed = try readIfPresent(unlockStampURL) else { return nil }
        let json = try VaultCrypto.open(sealed, key: key, purpose: .unlockStamp)
        return try JSONDecoder().decode(UnlockStamp.self, from: json)
    }

    func saveUnlockStamp(_ stamp: UnlockStamp, key: SymmetricKey) throws {
        let json = try JSONEncoder().encode(stamp)
        try writeProtected(try VaultCrypto.seal(json, key: key, purpose: .unlockStamp), to: unlockStampURL)
    }

    /// Ends the keyboard's window straight away.
    func removeUnlockStamp() throws {
        try removeIfPresent(unlockStampURL)
    }

    // MARK: Erase

    func eraseAll() throws {
        try removeIfPresent(unlockStampURL)
        try removeIfPresent(vaultURL)
    }

    // MARK: Files

    private func readIfPresent(_ url: URL) throws -> Data? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try Data(contentsOf: url)
    }

    private func removeIfPresent(_ url: URL) throws {
        guard FileManager.default.fileExists(atPath: url.path) else { return }
        try FileManager.default.removeItem(at: url)
    }

    /// Atomic write with complete file protection (unreadable while the iPhone is locked),
    /// kept out of iCloud and computer backups.
    private func writeProtected(_ data: Data, to url: URL) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var folder = directory
        var folderValues = URLResourceValues()
        folderValues.isExcludedFromBackup = true
        try folder.setResourceValues(folderValues)

        try data.write(to: url, options: [.atomic, .completeFileProtection])
        var file = url
        var fileValues = URLResourceValues()
        fileValues.isExcludedFromBackup = true
        try file.setResourceValues(fileValues)
    }
}
