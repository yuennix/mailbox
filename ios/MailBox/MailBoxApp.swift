//
//  MailBoxApp.swift
//  MailBox
//
//  Created by Rork on May 19, 2026.
//

import SwiftUI
import SwiftData

@main
struct MailBoxApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            TempEmailAccount.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
