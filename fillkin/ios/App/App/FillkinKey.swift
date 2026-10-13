import UIKit
import Capacitor
import LocalAuthentication
import Security

/// Hosts the web app and registers Fillkin's own native plugin.
class FillkinViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FillkinKeyPlugin())
    }
}

/// Keeps Fillkin's locked data on this phone, and the unlock key behind Face ID.
///
/// - The data itself is encrypted in the web app (AES-GCM) before it gets here. It is
///   written to a file that iOS also encrypts whenever the phone is locked.
/// - The unlock key is stored in the Keychain so that only Face ID or Touch ID on this
///   phone can read it. If someone adds a new face or fingerprint, the key stops working
///   and the person has to use their Fillkin passcode again.
@objc(FillkinKeyPlugin)
public class FillkinKeyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FillkinKeyPlugin"
    public let jsName = "FillkinKey"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readVault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeVault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verify", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "eraseAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise)
    ]

    private let service = "io.github.watersanthony232.fillkin.unlock"
    private let account = "vault-key"

    private var vaultURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("fillkin-vault.json")
    }

    // MARK: Face ID / Touch ID

    @objc func status(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err)
        var type = "none"
        switch ctx.biometryType {
        case .faceID: type = "faceID"
        case .touchID: type = "touchID"
        default: break
        }
        if #available(iOS 17.0, *), ctx.biometryType == .opticID { type = "opticID" }
        call.resolve(["available": ok, "type": type])
    }

    @objc func saveKey(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let data = key.data(using: .utf8) else {
            return call.reject("No key given", "nokey")
        }
        var cfErr: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, &cfErr
        ) else {
            return call.reject("Face ID is not set up on this phone", "unavailable")
        }
        SecItemDelete(baseQuery() as CFDictionary)
        var add = baseQuery()
        add[kSecValueData as String] = data
        add[kSecAttrAccessControl as String] = access
        let status = SecItemAdd(add as CFDictionary, nil)
        if status == errSecSuccess { call.resolve() } else { call.reject("Could not save the key (\(status))", "failed") }
    }

    @objc func loadKey(_ call: CAPPluginCall) {
        let ctx = LAContext()
        ctx.localizedReason = call.getString("reason") ?? "Unlock Fillkin"
        ctx.localizedFallbackTitle = ""
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        query[kSecUseAuthenticationContext as String] = ctx
        // Reading the key shows the Face ID prompt, so keep it off the main thread.
        DispatchQueue.global(qos: .userInitiated).async {
            var out: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &out)
            switch status {
            case errSecSuccess:
                if let data = out as? Data, let key = String(data: data, encoding: .utf8) {
                    call.resolve(["key": key])
                } else {
                    call.reject("The key could not be read", "failed")
                }
            case errSecUserCanceled:
                call.reject("Cancelled", "cancelled")
            case errSecItemNotFound:
                call.reject("Face ID needs setting up again", "nokey")
            default:
                call.reject("Face ID didn't work (\(status))", "failed")
            }
        }
    }

    @objc func deleteKey(_ call: CAPPluginCall) {
        SecItemDelete(baseQuery() as CFDictionary)
        call.resolve()
    }

    @objc func verify(_ call: CAPPluginCall) {
        let ctx = LAContext()
        ctx.localizedFallbackTitle = ""
        ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                           localizedReason: call.getString("reason") ?? "Confirm it's you") { ok, err in
            if ok { return call.resolve() }
            let code = (err as? LAError)?.code
            call.reject("Not confirmed", code == .userCancel || code == .appCancel || code == .systemCancel ? "cancelled" : "failed")
        }
    }

    // MARK: Locked data file

    @objc func readVault(_ call: CAPPluginCall) {
        guard let data = try? Data(contentsOf: vaultURL), let text = String(data: data, encoding: .utf8) else {
            return call.resolve([:])
        }
        call.resolve(["data": text])
    }

    @objc func writeVault(_ call: CAPPluginCall) {
        guard let text = call.getString("data"), let data = text.data(using: .utf8) else {
            return call.reject("Nothing to save", "nodata")
        }
        do {
            try FileManager.default.createDirectory(at: vaultURL.deletingLastPathComponent(),
                                                    withIntermediateDirectories: true)
            try data.write(to: vaultURL, options: [.atomic, .completeFileProtection])
            call.resolve()
        } catch {
            call.reject("Could not save: \(error.localizedDescription)", "failed")
        }
    }

    @objc func eraseAll(_ call: CAPPluginCall) {
        SecItemDelete(baseQuery() as CFDictionary)
        try? FileManager.default.removeItem(at: vaultURL)
        call.resolve()
    }

    // MARK: Locked backup file

    /// Opens the iPhone share sheet so the person can save the (already encrypted)
    /// backup to Files, iCloud Drive, Google Drive, email and so on.
    @objc func shareFile(_ call: CAPPluginCall) {
        // "data" is UTF-8 text (backup or summary); "b64" is binary (a PDF).
        // With asText, the text itself is shared (for Messages, WhatsApp, Notes), not a file.
        guard let name = call.getString("name") else {
            return call.reject("Nothing to share", "nodata")
        }
        let asText = call.getBool("asText") ?? false
        var data: Data?
        if let b64 = call.getString("b64") {
            data = Data(base64Encoded: b64)
        } else if let text = call.getString("data") {
            data = text.data(using: .utf8)
        }
        guard let fileData = data else {
            return call.reject("Nothing to share", "nodata")
        }
        let safeName = name.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
        var items: [Any] = [url]
        if asText, let text = call.getString("data") {
            items = [text]
        } else {
            do {
                try fileData.write(to: url, options: [.atomic, .completeFileProtection])
            } catch {
                return call.reject("Could not make the file", "failed")
            }
        }
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                return call.reject("Could not open the share sheet", "failed")
            }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0)
            }
            sheet.completionWithItemsHandler = { _, done, _, _ in
                try? FileManager.default.removeItem(at: url)
                call.resolve(["saved": done])
            }
            vc.present(sheet, animated: true)
        }
    }

    private func baseQuery() -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }
}
