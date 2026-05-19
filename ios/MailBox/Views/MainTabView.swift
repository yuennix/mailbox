import SwiftUI
import SwiftData

struct MainTabView: View {
    @Environment(\.modelContext) private var modelContext
    
    var body: some View {
        TabView {
            BrowserView()
                .tabItem {
                    Label("Browser", systemImage: "globe")
                }
            
            EmailListView(modelContext: modelContext)
                .tabItem {
                    Label("Accounts", systemImage: "envelope.stack")
                }
            
            ToolsView()
                .tabItem {
                    Label("Tools", systemImage: "wrench.and.screwdriver")
                }
        }
        .tint(.cyan)
    }
}
