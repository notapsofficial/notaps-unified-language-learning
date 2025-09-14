import SwiftUI
import Speech
import AVFoundation

@main
struct NotapsUnifiedApp: App {
    @StateObject private var speechAuthManager = SpeechAuthManager()
    @StateObject private var audioSessionManager = AudioSessionManager()
    @StateObject private var learningProgressManager = LearningProgressManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(speechAuthManager)
                .environmentObject(audioSessionManager)
                .environmentObject(learningProgressManager)
                .onAppear {
                    setupApp()
                }
        }
    }
    
    private func setupApp() {
        // Audio session setup for speech recognition and TTS
        audioSessionManager.configureAudioSession()
        
        // Request speech recognition permissions
        speechAuthManager.requestSpeechAuthorization()
    }
}

// MARK: - Authentication and Permission Managers
@MainActor
class SpeechAuthManager: ObservableObject {
    @Published var speechAuthorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined
    
    func requestSpeechAuthorization() {
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                self.speechAuthorizationStatus = status
            }
        }
    }
}

@MainActor
class AudioSessionManager: ObservableObject {
    @Published var isAudioSessionConfigured = false
    
    func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try audioSession.setActive(true)
            isAudioSessionConfigured = true
        } catch {
            print("Audio session configuration failed: \(error)")
            isAudioSessionConfigured = false
        }
    }
}

@MainActor
class LearningProgressManager: ObservableObject {
    @Published var currentLevel: Int = 1
    @Published var completedLessons: Int = 0
    @Published var pronunciationScore: Double = 0.0
    @Published var vocabularyMastered: Int = 0
    
    // Save learning progress locally (Core Data integration will be added later)
    func updateProgress(level: Int, lessons: Int, score: Double, vocabulary: Int) {
        currentLevel = level
        completedLessons = lessons
        pronunciationScore = score
        vocabularyMastered = vocabulary
        
        // TODO: Save to Core Data
        saveProgressToUserDefaults()
    }
    
    private func saveProgressToUserDefaults() {
        let defaults = UserDefaults.standard
        defaults.set(currentLevel, forKey: "currentLevel")
        defaults.set(completedLessons, forKey: "completedLessons")
        defaults.set(pronunciationScore, forKey: "pronunciationScore")
        defaults.set(vocabularyMastered, forKey: "vocabularyMastered")
    }
    
    func loadProgress() {
        let defaults = UserDefaults.standard
        currentLevel = defaults.integer(forKey: "currentLevel")
        completedLessons = defaults.integer(forKey: "completedLessons")
        pronunciationScore = defaults.double(forKey: "pronunciationScore")
        vocabularyMastered = defaults.integer(forKey: "vocabularyMastered")
    }
}