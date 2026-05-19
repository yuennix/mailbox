import SwiftUI
import WebKit
import UIKit

struct BrowserView: View {
    @State private var viewModel = BrowserViewModel()
    @State private var showActionSheet = false
    @State private var showURLInput = false
    @State private var urlInput = ""
    @State private var showAutomationTools = false
    @State private var generatedUsername = ""
    
    var body: some View {
        NavigationStack {
            ZStack {
                WebViewContainer(webView: viewModel.webView)
                    .ignoresSafeArea(.container, edges: .bottom)
                
                if viewModel.isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(.cyan)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.ultraThinMaterial)
                }
            }
            .navigationTitle(viewModel.pageTitle.isEmpty ? "Yopmail" : viewModel.pageTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarLeading) {
                    Button(action: { viewModel.goBack() }) {
                        Image(systemName: "chevron.backward")
                    }
                    .disabled(!viewModel.canGoBack)
                    
                    Button(action: { viewModel.goForward() }) {
                        Image(systemName: "chevron.forward")
                    }
                    .disabled(!viewModel.canGoForward)
                }
                
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.reload() }) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)
                    
                    Button(action: { showAutomationTools = true }) {
                        Image(systemName: "wand.and.stars")
                            .foregroundStyle(viewModel.captchaDetected ? .red : .cyan)
                    }
                    
                    Button(action: { showActionSheet = true }) {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .confirmationDialog("Browser Options", isPresented: $showActionSheet) {
                Button("Load Yopmail") {
                    viewModel.loadYopmail()
                }
                Button("Enter URL") {
                    urlInput = viewModel.currentURL?.absoluteString ?? ""
                    showURLInput = true
                }
                Button("Copy URL") {
                    if let url = viewModel.currentURL?.absoluteString {
                        UIPasteboard.general.string = url
                    }
                }
                Button("Cancel", role: .cancel) { }
            }
            .sheet(isPresented: $showURLInput) {
                NavigationStack {
                    Form {
                        Section {
                            TextField("URL", text: $urlInput)
                                .keyboardType(.URL)
                                .textInputAutocapitalization(.never)
                        }
                    }
                    .navigationTitle("Enter URL")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showURLInput = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Load") {
                                if let url = URL(string: urlInput), url.scheme != nil {
                                    viewModel.loadURL(url)
                                    showURLInput = false
                                }
                            }
                        }
                    }
                }
            }
            .sheet(isPresented: $showAutomationTools) {
                AutomationToolsSheet(viewModel: viewModel, generatedUsername: $generatedUsername)
            }
            .onAppear {
                viewModel.loadYopmail()
            }
            .overlay(alignment: .top) {
                if let error = viewModel.errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text(error)
                            .font(.caption)
                        Spacer()
                        Button("Dismiss") {
                            viewModel.errorMessage = nil
                        }
                        .font(.caption)
                    }
                    .padding()
                    .background(.red.opacity(0.15))
                    .clipShape(.rect(cornerRadius: 8))
                    .padding(.horizontal)
                }
            }
        }
    }
}

struct WebViewContainer: UIViewRepresentable {
    let webView: WKWebView
    
    func makeUIView(context: Context) -> WKWebView {
        webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) { }
}

struct AutomationToolsSheet: View {
    let viewModel: BrowserViewModel
    @Binding var generatedUsername: String
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section("Quick Actions") {
                    Button("Inject Anti-Captcha Scripts") {
                        Task { await viewModel.injectAntiCaptcha() }
                        dismiss()
                    }
                    .foregroundStyle(.cyan)
                    
                    Button("Generate & Fill Username") {
                        Task {
                            if let username = await viewModel.generateAndFillUsername() {
                                generatedUsername = username
                            }
                        }
                        dismiss()
                    }
                    .foregroundStyle(.cyan)
                    
                    Button("Submit Login Form") {
                        Task { await viewModel.submitLogin() }
                        dismiss()
                    }
                    .foregroundStyle(.cyan)
                    
                    Button("Refresh Inbox") {
                        Task { await viewModel.refreshInbox() }
                        dismiss()
                    }
                    .foregroundStyle(.cyan)
                }
                
                Section("Status") {
                    if viewModel.captchaDetected {
                        Label("CAPTCHA detected on page", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    } else {
                        Label("No CAPTCHA detected", systemImage: "checkmark.shield.fill")
                            .foregroundStyle(.green)
                    }
                    
                    if !generatedUsername.isEmpty {
                        HStack {
                            Label("Generated: \(generatedUsername)", systemImage: "person.fill")
                            Spacer()
                            Button("Copy") {
                                UIPasteboard.general.string = generatedUsername
                            }
                            .font(.caption)
                        }
                    }
                    
                    if let result = viewModel.lastActionResult {
                        Label("Last action: \(result)", systemImage: "info.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
                
                Section("Navigate") {
                    Button("Go to Yopmail Home") {
                        viewModel.loadYopmail()
                        dismiss()
                    }
                }
            }
            .navigationTitle("Automation Tools")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
