import Foundation
import WebKit
import Combine

@Observable
final class BrowserViewModel: NSObject {
    var currentURL: URL?
    var isLoading = false
    var canGoBack = false
    var canGoForward = false
    var pageTitle = ""
    var errorMessage: String?
    var captchaDetected = false
    var lastActionResult: String?
    
    let webView: WKWebView
    private let automationService = WebAutomationService()
    private let yopmailService = YopmailService()
    
    override init() {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        self.webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        
        webView.navigationDelegate = self
        webView.uiDelegate = self
    }
    
    func loadYopmail() {
        guard let url = URL(string: "https://yopmail.com") else { return }
        loadURL(url)
    }
    
    func loadURL(_ url: URL) {
        currentURL = url
        let request = URLRequest(url: url)
        webView.load(request)
    }
    
    func goBack() {
        webView.goBack()
    }
    
    func goForward() {
        webView.goForward()
    }
    
    func reload() {
        webView.reload()
    }
    
    func stopLoading() {
        webView.stopLoading()
    }
    
    func injectAntiCaptcha() async {
        let script = automationService.injectAntiCaptchaScript()
        do {
            let result = try await webView.evaluateJavaScriptAsync(script)
            lastActionResult = result as? String
        } catch {
            errorMessage = "Injection failed: \(error.localizedDescription)"
        }
    }
    
    func generateAndFillUsername() async -> String? {
        let script = automationService.generateUsernameScript()
        do {
            let result = try await webView.evaluateJavaScriptAsync(script)
            return result as? String
        } catch {
            errorMessage = "Failed to fill username: \(error.localizedDescription)"
            return nil
        }
    }
    
    func submitLogin() async {
        let script = automationService.submitLoginScript()
        do {
            let result = try await webView.evaluateJavaScriptAsync(script)
            lastActionResult = result as? String
        } catch {
            errorMessage = "Submit failed: \(error.localizedDescription)"
        }
    }
    
    func checkCaptcha() async {
        let script = automationService.checkForCaptchaScript()
        do {
            let result = try await webView.evaluateJavaScriptAsync(script)
            if let status = result as? String {
                captchaDetected = status.contains("CAPTCHA_DETECTED")
            }
        } catch {
            captchaDetected = false
        }
    }
    
    func refreshInbox() async {
        let script = automationService.clickRefreshScript()
        do {
            let result = try await webView.evaluateJavaScriptAsync(script)
            lastActionResult = result as? String
        } catch {
            errorMessage = "Refresh failed: \(error.localizedDescription)"
        }
    }
    
    func navigateToInbox(username: String) {
        guard let url = yopmailService.buildInboxURL(username: username) else { return }
        loadURL(url)
    }
}

extension BrowserViewModel: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true
        errorMessage = nil
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
        pageTitle = webView.title ?? ""
        currentURL = webView.url
        
        Task {
            await checkCaptcha()
        }
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        errorMessage = error.localizedDescription
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        if (error as NSError).code != NSURLErrorCancelled {
            errorMessage = error.localizedDescription
        }
    }
}

extension BrowserViewModel: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            loadURL(url)
        }
        return nil
    }
}

extension WKWebView {
    func evaluateJavaScriptAsync(_ script: String) async throws -> Any? {
        try await withCheckedThrowingContinuation { continuation in
            evaluateJavaScript(script) { result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: result)
                }
            }
        }
    }
}
