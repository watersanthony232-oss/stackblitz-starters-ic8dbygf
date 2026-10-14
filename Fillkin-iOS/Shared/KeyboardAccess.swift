import Foundation

/// What the keyboard is allowed to show right now.
enum KeyboardAccess {
    /// Show "Open Fillkin to unlock".
    case locked
    /// Show these details until `until`.
    case unlocked(FillkinCard, until: Date)

    /// Reads the shared key, the unlock stamp and the vault. Any failure means locked.
    static func current(store: SharedStore? = try? SharedStore.appGroup(), now: Date = Date(),
                        uptime: TimeInterval = ProcessInfo.processInfo.systemUptime) -> KeyboardAccess {
        guard let store,
              let key = try? DataKeyStore.load(),
              let stamp = try? store.loadUnlockStamp(key: key) else { return .locked }
        let remaining = stamp.secondsRemaining(nowWall: now, nowUptime: uptime)
        guard remaining > 0,
              let contents = try? store.loadVault(key: key) else { return .locked }
        return .unlocked(contents.card, until: now.addingTimeInterval(remaining))
    }
}
