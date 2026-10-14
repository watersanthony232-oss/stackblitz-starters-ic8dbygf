import Foundation

/// One person's details. Date of birth is kept exactly as typed in the three boxes.
struct Person: Codable, Identifiable, Equatable {
    var id = UUID()
    var fullName = ""
    var dobDay = ""
    var dobMonth = ""
    var dobYear = ""
    var address = ""
    var postcode = ""
    var phone = ""
    var email = ""

    init() {}

    // Missing keys decode as empty, so adding a field later never loses saved data.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        fullName = try c.decodeIfPresent(String.self, forKey: .fullName) ?? ""
        dobDay = try c.decodeIfPresent(String.self, forKey: .dobDay) ?? ""
        dobMonth = try c.decodeIfPresent(String.self, forKey: .dobMonth) ?? ""
        dobYear = try c.decodeIfPresent(String.self, forKey: .dobYear) ?? ""
        address = try c.decodeIfPresent(String.self, forKey: .address) ?? ""
        postcode = try c.decodeIfPresent(String.self, forKey: .postcode) ?? ""
        phone = try c.decodeIfPresent(String.self, forKey: .phone) ?? ""
        email = try c.decodeIfPresent(String.self, forKey: .email) ?? ""
    }

    func dateOfBirth(today: Date = Date()) -> DateOfBirth? {
        try? DateOfBirth.parse(day: dobDay, month: dobMonth, year: dobYear, today: today).get()
    }

    /// Adult or Child, worked out from the date of birth. Nil until a valid date is entered.
    func ageGroup(today: Date = Date()) -> AgeGroup? {
        dateOfBirth(today: today)?.ageGroup(on: today)
    }

    var displayName: String {
        let name = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        return name.isEmpty ? "No name yet" : name
    }
}

/// The adult's Fillkin card, with their children saved under it.
struct FillkinCard: Codable, Equatable {
    var adult = Person()
    var children: [Person] = []

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        adult = try c.decodeIfPresent(Person.self, forKey: .adult) ?? Person()
        children = try c.decodeIfPresent([Person].self, forKey: .children) ?? []
    }

    /// The adult first, then children in the order they were added.
    var everyone: [Person] { [adult] + children }
}

/// What the encrypted vault file holds.
struct VaultContents: Codable, Equatable {
    var version = 1
    var card = FillkinCard()
}

/// The details the keyboard can type, in the order it shows them.
enum FillField: CaseIterable {
    case fullName, dateOfBirth, address, postcode, phone, email

    var label: String {
        switch self {
        case .fullName: return "Name"
        case .dateOfBirth: return "Date of birth"
        case .address: return "Address"
        case .postcode: return "Postcode"
        case .phone: return "Phone"
        case .email: return "Email"
        }
    }

    /// The text to type, or nil if that detail is empty or invalid.
    func text(for person: Person, today: Date = Date()) -> String? {
        let value: String
        switch self {
        case .fullName: value = person.fullName
        case .dateOfBirth: value = person.dateOfBirth(today: today)?.formatted ?? ""
        // Lines joined with commas: a typed newline can submit a one-line form field.
        case .address: value = person.address
            .split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
        case .postcode: value = person.postcode
        case .phone: value = person.phone
        case .email: value = person.email
        }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
