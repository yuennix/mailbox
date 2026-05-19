import Foundation
import SwiftData
import UIKit

@Observable
final class EmailListViewModel {
    var accounts: [TempEmailAccount] = []
    var isLoading = false
    var errorMessage: String?
    var selectedAccount: TempEmailAccount?
    
    private let yopmailService = YopmailService()
    private let modelContext: ModelContext
    
    init(modelContext: ModelContext) {
        self.modelContext = modelContext
        fetchAccounts()
    }
    
    func fetchAccounts() {
        let descriptor = FetchDescriptor<TempEmailAccount>(
            sortBy: [SortDescriptor(\.lastAccessed, order: .reverse)]
        )
        do {
            accounts = try modelContext.fetch(descriptor)
        } catch {
            errorMessage = "Failed to load accounts: \(error.localizedDescription)"
        }
    }
    
    func createAccount(username: String? = nil, note: String = "") {
        let name = username ?? yopmailService.generateRandomUsername()
        let account = TempEmailAccount(username: name, note: note)
        modelContext.insert(account)
        
        do {
            try modelContext.save()
            fetchAccounts()
        } catch {
            errorMessage = "Failed to save account: \(error.localizedDescription)"
        }
    }
    
    func deleteAccount(_ account: TempEmailAccount) {
        modelContext.delete(account)
        do {
            try modelContext.save()
            fetchAccounts()
        } catch {
            errorMessage = "Failed to delete account: \(error.localizedDescription)"
        }
    }
    
    func toggleFavorite(_ account: TempEmailAccount) {
        account.isFavorite.toggle()
        account.lastAccessed = Date()
        do {
            try modelContext.save()
            fetchAccounts()
        } catch {
            errorMessage = "Failed to update account: \(error.localizedDescription)"
        }
    }
    
    func updateNote(_ account: TempEmailAccount, note: String) {
        account.note = note
        do {
            try modelContext.save()
            fetchAccounts()
        } catch {
            errorMessage = "Failed to update note: \(error.localizedDescription)"
        }
    }
    
    func copyToClipboard(_ text: String) {
        UIPasteboard.general.string = text
    }
    
    func generateRandomAccount() {
        let username = yopmailService.generateRandomUsername()
        createAccount(username: username, note: "Auto-generated")
    }
    
    func accessAccount(_ account: TempEmailAccount) {
        account.lastAccessed = Date()
        do {
            try modelContext.save()
            fetchAccounts()
        } catch {
            errorMessage = "Failed to update access time"
        }
    }
}
