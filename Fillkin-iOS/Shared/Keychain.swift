import Foundation
import LocalAuthentication
import Security

enum KeychainError: Error, Equatable {
    case notFound
    case unexpectedData
    case accessControl
    case status(OSStatus)
}

/// Small wrapper around generic-password keychain items.
/// Every call names its access group explicitly, so nothing lands in a default group by accident.
enum Keychain {
    static let service = "com.auroraglance.fillkin"

    private static func baseQuery(account: String, group: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: group,
            kSecUseDataProtectionKeychain as String: true,
        ]
    }

    static func read(account: String, group: String, context: LAContext? = nil) throws -> Data {
        var query = baseQuery(account: account, group: group)
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        query[kSecReturnData as String] = true
        if let context {
            query[kSecUseAuthenticationContext as String] = context
        }
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { throw KeychainError.notFound }
        guard status == errSecSuccess else { throw KeychainError.status(status) }
        guard let data = result as? Data else { throw KeychainError.unexpectedData }
        return data
    }

    /// Replaces any existing item. `accessible` must be a ...ThisDeviceOnly class.
    static func write(_ data: Data, account: String, group: String, accessible: CFString) throws {
        try delete(account: account, group: group)
        var attributes = baseQuery(account: account, group: group)
        attributes[kSecAttrAccessible as String] = accessible
        attributes[kSecValueData as String] = data
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.status(status) }
    }

    /// Replaces any existing item with one guarded by an access control (for example Face ID).
    static func write(_ data: Data, account: String, group: String, accessControl: SecAccessControl) throws {
        try delete(account: account, group: group)
        var attributes = baseQuery(account: account, group: group)
        attributes[kSecAttrAccessControl as String] = accessControl
        attributes[kSecValueData as String] = data
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.status(status) }
    }

    static func delete(account: String, group: String) throws {
        let status = SecItemDelete(baseQuery(account: account, group: group) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.status(status)
        }
    }
}
