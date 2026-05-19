import Foundation
import SwiftData

@Model
final class TempEmailAccount {
    var id: UUID
    var username: String
    var domain: String
    var createdAt: Date
    var lastAccessed: Date
    var isFavorite: Bool
    var note: String
    
    var fullAddress: String {
        "\(username)@\(domain)"
    }
    
    init(username: String, domain: String = "yopmail.com", note: String = "") {
        self.id = UUID()
        self.username = username
        self.domain = domain
        self.createdAt = Date()
        self.lastAccessed = Date()
        self.isFavorite = false
        self.note = note
    }
}

struct ReceivedEmail: Identifiable, Codable {
    let id: String
    let sender: String
    let subject: String
    let preview: String
    let receivedAt: Date
    let isRead: Bool
    let bodyHtml: String?
}

struct CaptchaChallenge: Identifiable {
    let id: String
    let imageData: Data
    let timestamp: Date
}
