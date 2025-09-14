import Foundation
import SwiftUI

// MARK: - Core Vocabulary Models
struct VocabularyWord: Identifiable, Codable, Hashable {
    let id: UUID
    let word: String
    let pronunciation: String
    let phonetics: String?
    let definition: String
    let example: String?
    let language: LanguageCode
    let difficulty: DifficultyLevel
    let category: String
    let translations: [LanguageCode: Translation]
    
    init(
        word: String,
        pronunciation: String,
        phonetics: String? = nil,
        definition: String,
        example: String? = nil,
        language: LanguageCode,
        difficulty: DifficultyLevel,
        category: String,
        translations: [LanguageCode: Translation] = [:]
    ) {
        self.id = UUID()
        self.word = word
        self.pronunciation = pronunciation
        self.phonetics = phonetics
        self.definition = definition
        self.example = example
        self.language = language
        self.difficulty = difficulty
        self.category = category
        self.translations = translations
    }
}

struct Translation: Codable, Hashable {
    let word: String
    let pronunciation: String
    let phonetics: String?
    let definition: String
    let example: String?
}

enum LanguageCode: String, CaseIterable, Codable {
    case english = "en"
    case japanese = "ja"
    case korean = "ko"
    case french = "fr"
    case chinese = "zh"
    
    var displayName: String {
        switch self {
        case .english: return "English"
        case .japanese: return "日本語"
        case .korean: return "한국어"
        case .french: return "Français"
        case .chinese: return "中文"
        }
    }
    
    var speechCode: String {
        switch self {
        case .english: return "en-US"
        case .japanese: return "ja-JP"
        case .korean: return "ko-KR"
        case .french: return "fr-FR"
        case .chinese: return "zh-CN"
        }
    }
}

enum DifficultyLevel: String, CaseIterable, Codable {
    case beginner = "beginner"
    case intermediate = "intermediate"
    case advanced = "advanced"
    
    var displayName: String {
        switch self {
        case .beginner: return "初級"
        case .intermediate: return "中級"
        case .advanced: return "上級"
        }
    }
    
    var color: Color {
        switch self {
        case .beginner: return .green
        case .intermediate: return .orange
        case .advanced: return .red
        }
    }
}

// MARK: - Learning Progress Models
struct LearningProgress: Codable {
    let wordId: UUID
    var studyCount: Int
    var correctCount: Int
    var lastStudied: Date
    var masteryLevel: MasteryLevel
    var pronunciationScores: [Float]
    
    var accuracy: Double {
        guard studyCount > 0 else { return 0.0 }
        return Double(correctCount) / Double(studyCount)
    }
    
    var averagePronunciationScore: Float {
        guard !pronunciationScores.isEmpty else { return 0.0 }
        return pronunciationScores.reduce(0, +) / Float(pronunciationScores.count)
    }
    
    mutating func recordStudy(correct: Bool, pronunciationScore: Float? = nil) {
        studyCount += 1
        if correct {
            correctCount += 1
        }
        
        if let score = pronunciationScore {
            pronunciationScores.append(score)
            if pronunciationScores.count > 10 {
                pronunciationScores.removeFirst()
            }
        }
        
        lastStudied = Date()
        updateMasteryLevel()
    }
    
    private mutating func updateMasteryLevel() {
        let recentAccuracy = accuracy
        let recentPronunciation = averagePronunciationScore
        
        if studyCount >= 5 && recentAccuracy >= 0.9 && recentPronunciation >= 80 {
            masteryLevel = .mastered
        } else if studyCount >= 3 && recentAccuracy >= 0.7 && recentPronunciation >= 60 {
            masteryLevel = .learning
        } else {
            masteryLevel = .studying
        }
    }
}

enum MasteryLevel: String, CaseIterable, Codable {
    case new = "new"
    case studying = "studying"
    case learning = "learning"
    case mastered = "mastered"
    
    var displayName: String {
        switch self {
        case .new: return "新規"
        case .studying: return "学習中"
        case .learning: return "習得中"
        case .mastered: return "習得済み"
        }
    }
    
    var color: Color {
        switch self {
        case .new: return .gray
        case .studying: return .blue
        case .learning: return .orange
        case .mastered: return .green
        }
    }
}

// MARK: - Study Session Models
struct StudySession: Identifiable, Codable {
    let id: UUID
    let startTime: Date
    var endTime: Date?
    var wordsStudied: [UUID]
    var correctAnswers: Int
    var totalAnswers: Int
    var averagePronunciationScore: Float
    var sessionType: SessionType
    
    init(sessionType: SessionType) {
        self.id = UUID()
        self.startTime = Date()
        self.wordsStudied = []
        self.correctAnswers = 0
        self.totalAnswers = 0
        self.averagePronunciationScore = 0.0
        self.sessionType = sessionType
    }
    
    var duration: TimeInterval {
        return (endTime ?? Date()).timeIntervalSince(startTime)
    }
    
    var accuracy: Double {
        guard totalAnswers > 0 else { return 0.0 }
        return Double(correctAnswers) / Double(totalAnswers)
    }
    
    mutating func recordAnswer(correct: Bool, pronunciationScore: Float? = nil) {
        totalAnswers += 1
        if correct {
            correctAnswers += 1
        }
        
        if let score = pronunciationScore {
            let currentTotal = averagePronunciationScore * Float(totalAnswers - 1)
            averagePronunciationScore = (currentTotal + score) / Float(totalAnswers)
        }
    }
    
    mutating func endSession() {
        endTime = Date()
    }
}

enum SessionType: String, CaseIterable, Codable {
    case vocabulary = "vocabulary"
    case pronunciation = "pronunciation"
    case mixed = "mixed"
    case review = "review"
    
    var displayName: String {
        switch self {
        case .vocabulary: return "語彙学習"
        case .pronunciation: return "発音練習"
        case .mixed: return "総合学習"
        case .review: return "復習"
        }
    }
}

// MARK: - Lesson Models
struct Lesson: Identifiable, Codable {
    let id: UUID
    let title: String
    let description: String
    let difficulty: DifficultyLevel
    let targetLanguage: LanguageCode
    let sourceLanguage: LanguageCode
    let words: [UUID] // References to VocabularyWord IDs
    let estimatedDuration: TimeInterval
    let category: String
    
    init(
        title: String,
        description: String,
        difficulty: DifficultyLevel,
        targetLanguage: LanguageCode,
        sourceLanguage: LanguageCode,
        words: [UUID],
        estimatedDuration: TimeInterval,
        category: String
    ) {
        self.id = UUID()
        self.title = title
        self.description = description
        self.difficulty = difficulty
        self.targetLanguage = targetLanguage
        self.sourceLanguage = sourceLanguage
        self.words = words
        self.estimatedDuration = estimatedDuration
        self.category = category
    }
}