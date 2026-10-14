import Foundation

enum AgeGroup: String, Codable {
    case adult = "Adult"
    case child = "Child"

    /// Under 18 is a child.
    static let adultAge = 18

    init(age: Int) {
        self = age < AgeGroup.adultAge ? .child : .adult
    }
}

/// A date of birth typed as three boxes: Day / Month / Year.
struct DateOfBirth: Equatable {
    let day: Int
    let month: Int
    let year: Int

    enum Problem: Error, Equatable {
        case incomplete
        case invalidDay
        case invalidMonth
        case invalidYear
        case notARealDate
        case inFuture

        var message: String {
            switch self {
            case .incomplete: return "Enter day, month and year."
            case .invalidDay: return "Day must be between 1 and 31."
            case .invalidMonth: return "Month must be between 1 and 12."
            case .invalidYear: return "Enter the year as four digits, for example 1985."
            case .notARealDate: return "That date doesn't exist. Check the day and month."
            case .inFuture: return "Date of birth can't be in the future."
            }
        }
    }

    static let earliestYear = 1900

    /// Gregorian calendar in the phone's time zone, used for "today".
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        return calendar
    }

    static func parse(day: String, month: String, year: String,
                      today: Date = Date(), calendar: Calendar = DateOfBirth.calendar) -> Result<DateOfBirth, Problem> {
        let d = day.trimmingCharacters(in: .whitespaces)
        let m = month.trimmingCharacters(in: .whitespaces)
        let y = year.trimmingCharacters(in: .whitespaces)
        guard !d.isEmpty, !m.isEmpty, !y.isEmpty else { return .failure(.incomplete) }

        guard d.count <= 2, d.allSatisfy(\.isASCIIDigit), let dayValue = Int(d),
              (1...31).contains(dayValue) else { return .failure(.invalidDay) }
        guard m.count <= 2, m.allSatisfy(\.isASCIIDigit), let monthValue = Int(m),
              (1...12).contains(monthValue) else { return .failure(.invalidMonth) }

        let now = calendar.dateComponents([.year, .month, .day], from: today)
        guard let thisYear = now.year, let thisMonth = now.month, let thisDay = now.day else {
            return .failure(.incomplete)
        }
        guard y.count == 4, y.allSatisfy(\.isASCIIDigit), let yearValue = Int(y),
              (earliestYear...thisYear).contains(yearValue) else { return .failure(.invalidYear) }

        guard dayValue <= daysIn(month: monthValue, year: yearValue) else { return .failure(.notARealDate) }

        if (yearValue, monthValue, dayValue) > (thisYear, thisMonth, thisDay) {
            return .failure(.inFuture)
        }
        return .success(DateOfBirth(day: dayValue, month: monthValue, year: yearValue))
    }

    static func isLeapYear(_ year: Int) -> Bool {
        (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
    }

    static func daysIn(month: Int, year: Int) -> Int {
        switch month {
        case 2: return isLeapYear(year) ? 29 : 28
        case 4, 6, 9, 11: return 30
        default: return 31
        }
    }

    /// Whole years old on `date`. Someone born on 29 February turns a year older
    /// on 1 March in non-leap years.
    func age(on date: Date = Date(), calendar: Calendar = DateOfBirth.calendar) -> Int {
        let now = calendar.dateComponents([.year, .month, .day], from: date)
        guard let y = now.year, let m = now.month, let d = now.day else { return 0 }
        var age = y - year
        if (m, d) < (month, day) { age -= 1 }
        return max(age, 0)
    }

    func ageGroup(on date: Date = Date(), calendar: Calendar = DateOfBirth.calendar) -> AgeGroup {
        AgeGroup(age: age(on: date, calendar: calendar))
    }

    /// DD/MM/YYYY
    var formatted: String {
        String(format: "%02d/%02d/%04d", day, month, year)
    }
}

extension Character {
    var isASCIIDigit: Bool { ("0"..."9").contains(self) }
}
