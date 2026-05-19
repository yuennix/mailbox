import SwiftUI
import SwiftData

struct EmailListView: View {
    @State private var viewModel: EmailListViewModel
    @State private var showGenerateSheet = false
    @State private var showDeleteConfirmation = false
    @State private var accountToDelete: TempEmailAccount?
    @State private var newUsername = ""
    @State private var newNote = ""
    
    init(modelContext: ModelContext) {
        _viewModel = State(initialValue: EmailListViewModel(modelContext: modelContext))
    }
    
    var body: some View {
        NavigationStack {
            List {
                if !viewModel.accounts.filter(\.isFavorite).isEmpty {
                    Section("Favorites") {
                        ForEach(viewModel.accounts.filter(\.isFavorite)) { account in
                            AccountRow(account: account, viewModel: viewModel)
                        }
                    }
                }
                
                Section("All Accounts") {
                    ForEach(viewModel.accounts) { account in
                        AccountRow(account: account, viewModel: viewModel)
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            viewModel.deleteAccount(viewModel.accounts[index])
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Email Accounts")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    EditButton()
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showGenerateSheet = true }) {
                        Label("Add", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showGenerateSheet) {
                GenerateAccountSheet(viewModel: viewModel, isPresented: $showGenerateSheet)
            }
            .overlay {
                if viewModel.accounts.isEmpty {
                    EmptyAccountsView {
                        showGenerateSheet = true
                    }
                }
            }
            .alert("Error", isPresented: .init(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK") { viewModel.errorMessage = nil }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}

struct AccountRow: View {
    let account: TempEmailAccount
    let viewModel: EmailListViewModel
    @State private var showDetail = false
    
    var body: some View {
        Button(action: { showDetail = true }) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(account.fullAddress)
                        .font(.system(.body, design: .monospaced))
                        .foregroundStyle(.primary)
                    
                    if !account.note.isEmpty {
                        Text(account.note)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack(spacing: 8) {
                        Text(account.createdAt, format: .dateTime.month().day())
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        
                        if account.isFavorite {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundStyle(.yellow)
                        }
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .sheet(isPresented: $showDetail) {
            AccountDetailSheet(account: account, viewModel: viewModel)
        }
    }
}

struct AccountDetailSheet: View {
    let account: TempEmailAccount
    let viewModel: EmailListViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var editedNote: String
    
    init(account: TempEmailAccount, viewModel: EmailListViewModel) {
        self.account = account
        self.viewModel = viewModel
        _editedNote = State(initialValue: account.note)
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Email Address") {
                    HStack {
                        Text(account.fullAddress)
                            .font(.system(.body, design: .monospaced))
                        Spacer()
                        Button("Copy") {
                            viewModel.copyToClipboard(account.fullAddress)
                        }
                        .font(.caption)
                        .foregroundStyle(.cyan)
                    }
                }
                
                Section("Details") {
                    DatePicker("Created", selection: .constant(account.createdAt), displayedComponents: [.date, .hourAndMinute])
                        .disabled(true)
                    
                    HStack {
                        Text("Username")
                        Spacer()
                        Text(account.username)
                            .foregroundStyle(.secondary)
                            .font(.system(.body, design: .monospaced))
                    }
                    
                    HStack {
                        Text("Domain")
                        Spacer()
                        Text(account.domain)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Section("Note") {
                    TextField("Add a note", text: $editedNote, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("Actions") {
                    Button("Copy Username") {
                        viewModel.copyToClipboard(account.username)
                    }
                    .foregroundStyle(.cyan)
                    
                    Button("Copy Full Address") {
                        viewModel.copyToClipboard(account.fullAddress)
                    }
                    .foregroundStyle(.cyan)
                    
                    Button(account.isFavorite ? "Remove from Favorites" : "Add to Favorites") {
                        viewModel.toggleFavorite(account)
                        dismiss()
                    }
                    .foregroundStyle(account.isFavorite ? .orange : .yellow)
                    
                    Button("Open in Browser") {
                        viewModel.accessAccount(account)
                        dismiss()
                    }
                    .foregroundStyle(.cyan)
                    
                    Button("Delete Account", role: .destructive) {
                        viewModel.deleteAccount(account)
                        dismiss()
                    }
                }
            }
            .navigationTitle("Account Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        viewModel.updateNote(account, note: editedNote)
                        dismiss()
                    }
                }
            }
        }
    }
}

struct GenerateAccountSheet: View {
    let viewModel: EmailListViewModel
    @Binding var isPresented: Bool
    @State private var username = ""
    @State private var note = ""
    @State private var useRandom = true
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Generation Method") {
                    Toggle("Random Username", isOn: $useRandom)
                }
                
                if !useRandom {
                    Section("Custom Username") {
                        TextField("Enter username", text: $username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .textContentType(.username)
                    }
                }
                
                Section("Note (Optional)") {
                    TextField("Add a note", text: $note, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                Section {
                    Button("Generate Account") {
                        if useRandom {
                            viewModel.generateRandomAccount()
                        } else {
                            viewModel.createAccount(username: username, note: note)
                        }
                        isPresented = false
                    }
                    .foregroundStyle(.cyan)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .disabled(!useRandom && username.isEmpty)
                }
            }
            .navigationTitle("New Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
            }
        }
    }
}

struct EmptyAccountsView: View {
    let onCreate: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "envelope.badge.shield.half.filled")
                .font(.system(size: 60))
                .foregroundStyle(.cyan.opacity(0.6))
            
            Text("No Email Accounts")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create temporary email accounts for secure, disposable communication.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            Button("Create Account") {
                onCreate()
            }
            .buttonStyle(.borderedProminent)
            .tint(.cyan)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
