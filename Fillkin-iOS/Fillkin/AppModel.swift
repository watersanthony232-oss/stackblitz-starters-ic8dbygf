import CryptoKit
import Foundation
import Observation

/// App state: setup, locked or unlocked. Details are only held in memory while unlocked.
@MainActor
@Observable
final class AppModel {
    enum State: Equatable {
        case needsSetup
        case locked
        case unlocked
    }

    enum PinResult: Equatable {
        case success
        case wrong(attemptsBeforeWait: Int)
        case mustWait(seconds: Int)
    }

    private(set) var state: State
    /// Only set while unlocked.
    private(set) var card: FillkinCard?
    /// Shown on the lock screen, for example after Face ID changed.
    var lockMessage: String?
    var errorMessage: String?

    private var key: SymmetricKey?

    init() {
        let hasPIN = (try? PinStore.loadVerifier()) != nil
        let hasKey = (try? DataKeyStore.load()) != nil
        state = (hasPIN && hasKey) ? .locked : .needsSetup
    }

    // MARK: Setup

    /// First run: creates the data key, saves the PIN verifier and an empty card, then unlocks.
    func completeSetup(pin: String, useBiometrics: Bool) {
        guard PinVerifier.isWellFormed(pin) else { return }
        do {
            try eraseStoredData()
            let key = try DataKeyStore.create()
            try PinStore.saveVerifier(try PinVerifier.make(pin: pin))
            try PinStore.saveAttempts(PinAttempts())
            try store().saveVault(VaultContents(), key: key)
            if useBiometrics { try Biometrics.enable() }
            try openVault(with: key)
        } catch {
            errorMessage = "Fillkin couldn't finish setting up. Please try again."
        }
    }

    // MARK: Unlock

    func unlock(withPIN pin: String) -> PinResult {
        var attempts = PinStore.loadAttempts()
        let wait = attempts.waitRemaining()
        if wait > 0 { return .mustWait(seconds: Int(wait.rounded(.up))) }

        guard let verifier = try? PinStore.loadVerifier() else {
            state = .needsSetup
            return .wrong(attemptsBeforeWait: 0)
        }
        guard verifier.matches(pin) else {
            attempts.recordFailure()
            try? PinStore.saveAttempts(attempts)
            let left = max(0, PinAttempts.freeAttempts - attempts.failures)
            let wait = attempts.waitRemaining()
            return wait > 0 ? .mustWait(seconds: Int(wait.rounded(.up))) : .wrong(attemptsBeforeWait: left)
        }
        attempts.reset()
        try? PinStore.saveAttempts(attempts)
        unlockAfterAuthentication()
        return .success
    }

    /// Returns true if unlocked.
    func unlockWithBiometrics() async -> Bool {
        guard state == .locked, Biometrics.isEnabled else { return false }
        switch await Biometrics.authenticate() {
        case .success:
            unlockAfterAuthentication()
            return state == .unlocked
        case .enrollmentChanged:
            Biometrics.disable()
            lockMessage = "Face ID or Touch ID changed on this iPhone. Enter your PIN, then turn it back on in Settings."
            return false
        case .usePIN:
            return false
        }
    }

    private func unlockAfterAuthentication() {
        do {
            try openVault(with: try DataKeyStore.load())
        } catch {
            errorMessage = "Fillkin couldn't open your saved details."
        }
    }

    private func openVault(with key: SymmetricKey) throws {
        let store = try store()
        let contents = try store.loadVault(key: key) ?? VaultContents()
        // Starts the keyboard's 10-minute window.
        try store.saveUnlockStamp(.now(), key: key)
        self.key = key
        card = contents.card
        lockMessage = nil
        state = .unlocked
    }

    // MARK: Lock

    /// Locks the app and forgets the details in memory.
    /// The keyboard keeps its window from the last unlock.
    func lock() {
        guard state == .unlocked else { return }
        key = nil
        card = nil
        state = .locked
    }

    /// Locks the app and ends the keyboard's window straight away.
    func lockAppAndKeyboard() {
        try? store().removeUnlockStamp()
        lock()
    }

    /// Seconds the keyboard may still show details.
    func keyboardSecondsRemaining() -> TimeInterval {
        guard let key, let stamp = try? store().loadUnlockStamp(key: key) else { return 0 }
        return stamp.secondsRemaining()
    }

    // MARK: Editing

    func save(_ card: FillkinCard) {
        guard state == .unlocked, let key else { return }
        do {
            try store().saveVault(VaultContents(card: card), key: key)
            self.card = card
        } catch {
            errorMessage = "Fillkin couldn't save. Your last change wasn't kept."
        }
    }

    // MARK: Settings

    var biometricsEnabled: Bool { Biometrics.isEnabled }

    func setBiometrics(_ on: Bool) {
        guard state == .unlocked else { return }
        if on {
            do { try Biometrics.enable() } catch {
                errorMessage = "Couldn't turn on Face ID or Touch ID. Check a passcode is set on this iPhone."
            }
        } else {
            Biometrics.disable()
        }
    }

    func changePIN(to pin: String) -> Bool {
        guard state == .unlocked, PinVerifier.isWellFormed(pin) else { return false }
        do {
            try PinStore.saveVerifier(try PinVerifier.make(pin: pin))
            try PinStore.saveAttempts(PinAttempts())
            return true
        } catch {
            errorMessage = "Couldn't change the PIN."
            return false
        }
    }

    /// "Forgot PIN": deletes every Fillkin detail, key and setting on this iPhone.
    func eraseEverything() {
        try? eraseStoredData()
        key = nil
        card = nil
        lockMessage = nil
        state = .needsSetup
    }

    private func eraseStoredData() throws {
        try? store().eraseAll()
        Biometrics.disable()
        try PinStore.deleteAll()
        try DataKeyStore.delete()
    }

    private func store() throws -> SharedStore {
        try SharedStore.appGroup()
    }
}
