import Foundation
import SwiftData

enum YopmailError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case parsingError
    case captchaRequired
    case rateLimited
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid Yopmail URL"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        case .parsingError: return "Failed to parse response"
        case .captchaRequired: return "CAPTCHA verification required"
        case .rateLimited: return "Rate limited. Please wait."
        }
    }
}

@Observable
final class YopmailService {
    private let baseURL = "https://yopmail.com"
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        config.httpAdditionalHeaders = [
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br"
        ]
        self.session = URLSession(configuration: config)
    }
    
    func generateRandomUsername(length: Int = 10) -> String {
        let chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        return String((0..<length).map { _ in chars.randomElement()! })
    }
    
    func buildInboxURL(username: String) -> URL? {
        URL(string: "\(baseURL)/en/inbox.php?login=\(username)")
    }
    
    func buildComposeURL() -> URL? {
        URL(string: "\(baseURL)/en/compose.php")
    }
    
    func buildAlternateURL(username: String) -> String {
        "\(username)@yopmail.com"
    }
    
    func fetchInboxPage(username: String) async throws -> String {
        guard let url = buildInboxURL(username: username) else {
            throw YopmailError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw YopmailError.networkError(URLError(.badServerResponse))
        }
        
        if httpResponse.statusCode == 429 {
            throw YopmailError.rateLimited
        }
        
        guard let html = String(data: data, encoding: .utf8) else {
            throw YopmailError.parsingError
        }
        
        if html.contains("captcha") || html.contains("CAPTCHA") || html.contains("robot") {
            throw YopmailError.captchaRequired
        }
        
        return html
    }
    
    func checkCaptchaPresent(html: String) -> Bool {
        let captchaIndicators = ["captcha", "CAPTCHA", "robot", "verify", "recaptcha", "g-recaptcha"]
        return captchaIndicators.contains { html.lowercased().contains($0.lowercased()) }
    }
    
    func parseEmails(from html: String) -> [ReceivedEmail] {
        var emails: [ReceivedEmail] = []
        let pattern = #"<div[^>]*class="m"[^>]*>.*?<span[^>]*class="lmf"[^>]*>(.*?)</span>.*?<a[^>]*class="lms"[^>]*>(.*?)</a>.*?<span[^>]*class="lmh"[^>]*>(.*?)</span>.*?<div[^>]*class="lmexcerpt"[^>]*>(.*?)</div>"#
        
        do {
            let regex = try NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators])
            let nsRange = NSRange(html.startIndex..., in: html)
            let matches = regex.matches(in: html, options: [], range: nsRange)
            
            for (index, match) in matches.enumerated() {
                let sender = extractGroup(html, match: match, at: 1)
                let subject = extractGroup(html, match: match, at: 2)
                let timeStr = extractGroup(html, match: match, at: 3)
                let preview = extractGroup(html, match: match, at: 4)
                
                let email = ReceivedEmail(
                    id: "\(sender)_\(index)_\(timeStr)",
                    sender: sender,
                    subject: subject,
                    preview: preview,
                    receivedAt: parseTime(timeStr),
                    isRead: false,
                    bodyHtml: nil
                )
                emails.append(email)
            }
        } catch {
            print("Regex error: \(error)")
        }
        
        return emails
    }
    
    private func extractGroup(_ string: String, match: NSTextCheckingResult, at index: Int) -> String {
        guard let range = Range(match.range(at: index), in: string) else { return "" }
        return String(string[range])
            .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    private func parseTime(_ timeStr: String) -> Date {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        if let date = formatter.date(from: timeStr) {
            return date
        }
        formatter.dateFormat = "dd MMM HH:mm"
        return formatter.date(from: timeStr) ?? Date()
    }
}
