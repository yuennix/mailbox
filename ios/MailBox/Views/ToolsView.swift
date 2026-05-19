import SwiftUI
import UIKit

struct ToolsView: View {
    @State private var selectedUsername = ""
    @State private var generatedPassword = ""
    @State private var qrCodeText = ""
    @State private var showQRCode = false
    
    private let domains = [
        "yopmail.com",
        "yopmail.fr",
        "cool.fr.nf",
        "jetable.fr.nf",
        "nospam.ze.tc",
        "nomail.xl.cx",
        "mega.zik.dj",
        "speed.1s.fr"
    ]
    
    var body: some View {
        NavigationStack {
            List {
                Section("Generators") {
                    NavigationLink(destination: UsernameGeneratorView()) {
                        Label("Username Generator", systemImage: "person.badge.key")
                    }
                    
                    NavigationLink(destination: DomainPickerView(domains: domains)) {
                        Label("Yopmail Domains", systemImage: "globe")
                    }
                }
                
                Section("Yopmail Utilities") {
                    NavigationLink(destination: AlternateAddressView()) {
                        Label("Alternate Addresses", systemImage: "arrow.triangle.2.circlepath")
                    }
                    
                    NavigationLink(destination: QRCodeGeneratorView()) {
                        Label("QR Code Generator", systemImage: "qrcode")
                    }
                }
                
                Section("Automation") {
                    NavigationLink(destination: CaptchaInfoView()) {
                        Label("CAPTCHA Detection", systemImage: "exclamationmark.shield")
                    }
                    
                    NavigationLink(destination: AutomationScriptsView()) {
                        Label("Automation Scripts", systemImage: "command")
                    }
                }
                
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                    
                    Text("MailBox helps you manage temporary email accounts and automate Yopmail interactions. Use responsibly and respect website terms of service.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Tools")
        }
    }
}

struct UsernameGeneratorView: View {
    @State private var count = 5
    @State private var length = 10
    @State private var usernames: [String] = []
    @State private var includeNumbers = true
    
    private func generate() {
        let chars = "abcdefghijklmnopqrstuvwxyz" + (includeNumbers ? "0123456789" : "")
        usernames = (0..<count).map { _ in
            String((0..<length).map { _ in chars.randomElement()! })
        }
    }
    
    var body: some View {
        Form {
            Section("Options") {
                Stepper("Count: \(count)", value: $count, in: 1...20)
                Stepper("Length: \(length)", value: $length, in: 5...20)
                Toggle("Include Numbers", isOn: $includeNumbers)
            }
            
            Section {
                Button("Generate Usernames") {
                    generate()
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .foregroundStyle(.cyan)
            }
            
            if !usernames.isEmpty {
                Section("Results") {
                    ForEach(usernames, id: \.self) { username in
                        HStack {
                            Text(username)
                                .font(.system(.body, design: .monospaced))
                            Spacer()
                            Button("Copy") {
                                UIPasteboard.general.string = username
                            }
                            .font(.caption)
                            .foregroundStyle(.cyan)
                        }
                    }
                }
            }
        }
        .navigationTitle("Username Generator")
    }
}

struct DomainPickerView: View {
    let domains: [String]
    @State private var selectedDomain = ""
    @State private var username = ""
    
    var body: some View {
        Form {
            Section("Username") {
                TextField("Enter username", text: $username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
            
            Section("Available Domains") {
                ForEach(domains, id: \.self) { domain in
                    Button(action: { selectedDomain = domain }) {
                        HStack {
                            Text(domain)
                            Spacer()
                            if selectedDomain == domain {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.cyan)
                            }
                        }
                    }
                    .foregroundStyle(.primary)
                }
            }
            
            if !username.isEmpty && !selectedDomain.isEmpty {
                Section("Full Address") {
                    HStack {
                        Text("\(username)@\(selectedDomain)")
                            .font(.system(.body, design: .monospaced))
                        Spacer()
                        Button("Copy") {
                            UIPasteboard.general.string = "\(username)@\(selectedDomain)"
                        }
                        .font(.caption)
                        .foregroundStyle(.cyan)
                    }
                }
            }
        }
        .navigationTitle("Domains")
    }
}

struct AlternateAddressView: View {
    @State private var username = ""
    @State private var alternateFormats: [String] = []
    
    private let separators = [".", "-", "_", "+"]
    
    private func generateAlternates() {
        guard !username.isEmpty else { return }
        var results: [String] = []
        
        for sep in separators {
            let formatted = username.map { String($0) }.joined(separator: sep)
            results.append("\(formatted)@yopmail.com")
        }
        
        results.append("\(username)@yopmail.com")
        alternateFormats = results
    }
    
    var body: some View {
        Form {
            Section("Username") {
                TextField("Enter username", text: $username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                
                Button("Generate Alternates") {
                    generateAlternates()
                }
                .foregroundStyle(.cyan)
            }
            
            if !alternateFormats.isEmpty {
                Section("Alternate Formats") {
                    ForEach(alternateFormats, id: \.self) { format in
                        HStack {
                            Text(format)
                                .font(.system(.caption, design: .monospaced))
                                .lineLimit(1)
                            Spacer()
                            Button("Copy") {
                                UIPasteboard.general.string = format
                            }
                            .font(.caption2)
                            .foregroundStyle(.cyan)
                        }
                    }
                }
            }
        }
        .navigationTitle("Alternate Addresses")
    }
}

struct QRCodeGeneratorView: View {
    @State private var text = ""
    @State private var showQR = false
    
    var body: some View {
        Form {
            Section("Content") {
                TextField("Text or URL", text: $text, axis: .vertical)
                    .lineLimit(3...6)
            }
            
            Section {
                Button("Generate QR Code") {
                    showQR = true
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .foregroundStyle(.cyan)
                .disabled(text.isEmpty)
            }
        }
        .navigationTitle("QR Code")
        .sheet(isPresented: $showQR) {
            QRCodeDisplayView(text: text)
        }
    }
}

struct QRCodeDisplayView: View {
    let text: String
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                QRCodeView(data: text)
                    .frame(width: 250, height: 250)
                    .clipShape(.rect(cornerRadius: 12))
                
                Text(text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                Button("Copy Text") {
                    UIPasteboard.general.string = text
                }
                .buttonStyle(.bordered)
                .tint(.cyan)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("QR Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct QRCodeView: UIViewRepresentable {
    let data: String
    
    func makeUIView(context: Context) -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.image = generateQRCode(from: data)
        return imageView
    }
    
    func updateUIView(_ uiView: UIImageView, context: Context) {
        uiView.image = generateQRCode(from: data)
    }
    
    private func generateQRCode(from string: String) -> UIImage? {
        guard let data = string.data(using: .utf8) else { return nil }
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("H", forKey: "inputCorrectionLevel")
        guard let outputImage = filter.outputImage else { return nil }
        
        let scaleX = 250 / outputImage.extent.size.width
        let scaleY = 250 / outputImage.extent.size.height
        let transformedImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        return UIImage(ciImage: transformedImage)
    }
}

struct CaptchaInfoView: View {
    var body: some View {
        List {
            Section("Overview") {
                Text("Yopmail uses CAPTCHA challenges to prevent automated access. This app provides tools to detect and work with these challenges.")
                    .font(.body)
            }
            
            Section("Detection Methods") {
                Label("HTML pattern matching", systemImage: "text.magnifyingglass")
                Label("DOM element analysis", systemImage: "doc.text.magnifyingglass")
                Label("Response status monitoring", systemImage: "network")
            }
            
            Section("Tips") {
                Text("• Use the browser's automation tools to inject scripts")
                Text("• Generate random usernames to avoid patterns")
                Text("• Rate limiting may trigger additional challenges")
                Text("• Always respect website terms of service")
            }
            .font(.caption)
        }
        .navigationTitle("CAPTCHA Info")
    }
}

struct AutomationScriptsView: View {
    @State private var selectedScript = 0
    private let scripts = [
        ("Anti-Captcha Injection", "Hides captcha overlays and removes ad banners from the page"),
        ("Auto-Fill Username", "Generates a random username and fills the login field automatically"),
        ("Form Submission", "Attempts to find and submit the login form programmatically"),
        ("Email Extraction", "Parses the inbox page to extract email metadata"),
        ("Refresh Inbox", "Clicks the refresh button to reload the inbox contents")
    ]
    
    var body: some View {
        List {
            ForEach(Array(scripts.enumerated()), id: \.offset) { index, script in
                VStack(alignment: .leading, spacing: 4) {
                    Text(script.0)
                        .font(.headline)
                    Text(script.1)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Automation Scripts")
    }
}
