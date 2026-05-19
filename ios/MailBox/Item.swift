//
//  Item.swift
//  MailBox
//
//  Created by Rork on May 19, 2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date

    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
