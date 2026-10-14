import SwiftUI
import WebKit

/// The whole app screen: the Simple Zone website, a spinner while it first loads, and a friendly
/// "You're offline" screen (with Try again) when there is no internet.
struct WebScreen: View {
    @StateObject private var model = WebModel()

    var body: some View {
        ZStack {
            WebView(webView: model.webView)
            if model.loading && !model.loadedOnce {
                ProgressView().scaleEffect(1.4).tint(SZ.teal)
            }
            if model.offline {
                OfflineView { model.retry() }
            }
        }
    }
}

struct WebView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct OfflineView: View {
    let retry: () -> Void
    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.slash").font(.system(size: 44)).foregroundColor(SZ.teal)
            Text("You're offline").font(.title2.bold())
            Text("Simple Zone needs the internet to find local shops. Check your connection and try again.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
            Button("Try again", action: retry)
                .buttonStyle(.borderedProminent)
                .tint(SZ.teal)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SZ.background.ignoresSafeArea())
    }
}

final class WebModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    @Published var loading = true
    @Published var loadedOnce = false
    @Published var offline = false
    let webView: WKWebView

    override init() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true     // swipe from the left edge to go back
        webView.isOpaque = false
        webView.backgroundColor = UIColor(SZ.background)
        let refresh = UIRefreshControl()                        // pull down to refresh
        refresh.addTarget(self, action: #selector(pulled(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh
        webView.load(URLRequest(url: SZ.home))
    }

    @objc private func pulled(_ sender: UIRefreshControl) {
        retry()
        sender.endRefreshing()
    }

    func retry() {
        offline = false
        loading = true
        if webView.url == nil { webView.load(URLRequest(url: SZ.home)) } else { webView.reload() }
    }

    // Simple Zone pages stay in the app. Maps, phone calls, WhatsApp, email, the sign-up form and any other
    // website open in their own apps (or Safari) - so "Directions" opens Apple/Google Maps as normal.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == "about" || scheme == "blob" || scheme == "data" { return decisionHandler(.allow) }
        if scheme == "https" && url.host?.lowercased() == SZ.host { return decisionHandler(.allow) }
        let mainFrame = action.targetFrame?.isMainFrame ?? true
        if !mainFrame && (scheme == "https" || scheme == "http") { return decisionHandler(.allow) }
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    // Links that ask for a new window: our pages load here, anything else opens outside the app.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if url.host?.lowercased() == SZ.host { webView.load(URLRequest(url: url)) } else { UIApplication.shared.open(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { loading = true }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loading = false
        loadedOnce = true
        offline = false
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }

    private func failed(_ error: Error) {
        loading = false
        let e = error as NSError
        // Only show "offline" for real connection problems (not when a link was handed to another app).
        if e.domain == NSURLErrorDomain && e.code != NSURLErrorCancelled { offline = true }
    }

    // The website's pop-up messages (alert / "Are you sure?") as normal iPhone pop-ups.
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
