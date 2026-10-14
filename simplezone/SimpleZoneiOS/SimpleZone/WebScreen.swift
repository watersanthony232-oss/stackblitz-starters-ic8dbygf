import SwiftUI
import WebKit
import CoreLocation

/// The whole app screen: the Simple Zone app built into the phone (the `Web` folder), so it opens and
/// works without the website. Business details come from the published "Simplezone live" sheet;
/// with no internet the app shows the last copy it saved.
struct WebScreen: View {
    @StateObject private var model = WebModel()

    var body: some View {
        WebView(webView: model.webView)
            .ignoresSafeArea()  // the app keeps its own margins clear of the notch and home bar
    }
}

struct WebView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

final class WebModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler,
    CLLocationManagerDelegate
{
    let webView: WKWebView
    private let files = AppFiles()
    private let location = CLLocationManager()
    private var wantsLocation = false

    override init() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(files, forURLScheme: AppFiles.scheme)
        let bridge = config.userContentController
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        bridge.add(self, name: "sz")
        location.delegate = self
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(named: "LaunchBackground")  // white, or dark in Dark Mode
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.load(URLRequest(url: AppFiles.home))
    }

    // MARK: Messages from the app ("Near me", and screenshot-tour logs in test builds)

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "locate":
            locate()
        case "log":
            #if DEBUG
            print(body["text"] as? String ?? "")  // the GitHub simulator check reads these
            #endif
        default:
            break
        }
    }

    // MARK: Near me – location is only used on this phone, never stored or sent

    private func locate() {
        wantsLocation = true
        switch location.authorizationStatus {
        case .notDetermined: location.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways: location.requestLocation()
        default: located(error: "denied")
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard wantsLocation else { return }
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
        case .notDetermined: break
        default: located(error: "denied")
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard wantsLocation, let c = locations.last?.coordinate else { return }
        wantsLocation = false
        webView.evaluateJavaScript("window.szLocated && window.szLocated(\(c.latitude), \(c.longitude))")
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        located(error: "error")
    }

    private func located(error: String) {
        wantsLocation = false
        webView.evaluateJavaScript("window.szLocateFailed && window.szLocateFailed('\(error)')")
    }

    // MARK: Links

    // The app's own pages stay in the app. Phone calls, WhatsApp, Maps, email, the privacy policy and any
    // other website open in their own apps (or Safari).
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == AppFiles.scheme || scheme == "about" || scheme == "blob" || scheme == "data" {
            return decisionHandler(.allow)
        }
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    // Links that ask for a new window open outside the app.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { UIApplication.shared.open(url) }
        return nil
    }

    // If iOS ever stops the app's screen to save memory, load it again rather than show a blank page.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: AppFiles.home))
    }

    // MARK: Pop-up messages (alert / "Are you sure?") as normal iPhone pop-ups

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, orElse: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert) { completionHandler(false) }
    }

    private func present(_ alert: UIAlertController, orElse fallback: @escaping () -> Void) {
        let root = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
            .first
        var top = root
        while let shown = top?.presentedViewController { top = shown }
        if let top = top { top.present(alert, animated: true) } else { fallback() }
    }
}

/// Serves the app's own files from the `Web` folder at simplezone://app/…, and fetches the published
/// "Simplezone live" sheet for the app (only from docs.google.com).
final class AppFiles: NSObject, WKURLSchemeHandler {
    static let scheme = "simplezone"
    static let home = URL(string: "simplezone://app/index.html")!

    private let root = Bundle.main.url(forResource: "Web", withExtension: nil)
    private var stopped = Set<ObjectIdentifier>()

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return finish(task, status: 400) }
        if url.path == "/live-sheet.csv" { return fetchSheet(url, task) }
        guard let root = root else { return finish(task, status: 500) }
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL
        // Only files inside the Web folder.
        guard file.path.hasPrefix(root.standardizedFileURL.path + "/"), let data = try? Data(contentsOf: file) else {
            return finish(task, status: 404)
        }
        finish(task, status: 200, type: AppFiles.type(of: file.pathExtension), data: data)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        stopped.insert(ObjectIdentifier(task))
    }

    /// simplezone://app/live-sheet.csv?u=<published CSV link>
    private func fetchSheet(_ url: URL, _ task: WKURLSchemeTask) {
        let link = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "u" })?.value
        guard let link = link, let sheet = URL(string: link), sheet.scheme == "https",
              sheet.host?.lowercased() == "docs.google.com"
        else { return finish(task, status: 400) }
        var request = URLRequest(url: sheet, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpShouldHandleCookies = false
        URLSession.shared.dataTask(with: request) { data, response, _ in
            let ok = (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async {
                if ok, let data = data {
                    self.finish(task, status: 200, type: "text/csv; charset=utf-8", data: data)
                } else {
                    self.finish(task, status: 502)  // no internet or the sheet isn't published: the app shows its saved copy
                }
            }
        }.resume()
    }

    private func finish(_ task: WKURLSchemeTask, status: Int, type: String = "text/plain", data: Data = Data()) {
        guard !stopped.contains(ObjectIdentifier(task)), let url = task.request.url else { return }
        let headers = ["Content-Type": type, "Cache-Control": "no-store"]
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    private static func type(of ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "json": return "application/json"
        case "woff2": return "font/woff2"
        case "otf": return "font/otf"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
}
