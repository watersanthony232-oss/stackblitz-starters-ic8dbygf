import Foundation

/// When the app was last unlocked. The keyboard shows details only within
/// `FillkinConfig.keyboardUnlockWindow` of this moment.
///
/// Two clocks are recorded and both must agree, so moving the phone's clock
/// back can't stretch the window. Anything odd counts as locked.
struct UnlockStamp: Codable, Equatable {
    /// Wall-clock time of the unlock.
    var wallClock: Date
    /// Seconds since the phone started (does not change when the clock is set).
    var uptime: TimeInterval

    static func now() -> UnlockStamp {
        UnlockStamp(wallClock: Date(), uptime: ProcessInfo.processInfo.systemUptime)
    }

    /// Seconds the keyboard may still show details, or 0 if it must show
    /// "Open Fillkin to unlock".
    func secondsRemaining(nowWall: Date = Date(),
                          nowUptime: TimeInterval = ProcessInfo.processInfo.systemUptime,
                          window: TimeInterval = FillkinConfig.keyboardUnlockWindow) -> TimeInterval {
        let wallElapsed = nowWall.timeIntervalSince(wallClock)
        let uptimeElapsed = nowUptime - uptime
        // Negative uptime means the phone restarted; a wall clock well behind
        // the stamp means the clock was moved. Both count as locked.
        guard uptimeElapsed >= 0, wallElapsed >= -5 else { return 0 }
        let elapsed = max(wallElapsed, uptimeElapsed)
        return max(0, window - elapsed)
    }

    func allowsKeyboard(nowWall: Date = Date(),
                        nowUptime: TimeInterval = ProcessInfo.processInfo.systemUptime,
                        window: TimeInterval = FillkinConfig.keyboardUnlockWindow) -> Bool {
        secondsRemaining(nowWall: nowWall, nowUptime: nowUptime, window: window) > 0
    }
}
