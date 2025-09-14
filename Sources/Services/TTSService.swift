import AVFoundation
import SwiftUI

@MainActor
class TTSService: NSObject, ObservableObject {
    @Published var isSpeaking = false
    @Published var errorMessage = ""
    @Published var currentLanguage = "en-US"
    @Published var speechRate: Float = 0.5
    @Published var speechPitch: Float = 1.0
    @Published var speechVolume: Float = 1.0
    
    private var synthesizer = AVSpeechSynthesizer()
    private let supportedLanguages = ["en-US", "ja-JP", "ko-KR", "fr-FR", "zh-CN"]
    
    override init() {
        super.init()
        synthesizer.delegate = self
        setupAudioSession()
    }
    
    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            errorMessage = "Audio session setup failed: \(error.localizedDescription)"
        }
    }
    
    func speak(_ text: String, language: String? = nil) {
        guard !text.isEmpty else {
            errorMessage = "No text to speak"
            return
        }
        
        // Stop any current speech
        stop()
        
        let utterance = AVSpeechUtterance(string: text)
        
        // Set language
        let lang = language ?? currentLanguage
        if supportedLanguages.contains(lang) {
            utterance.voice = AVSpeechSynthesisVoice(language: lang)
        } else {
            utterance.voice = AVSpeechSynthesisVoice(language: currentLanguage)
        }
        
        // Configure speech parameters
        utterance.rate = speechRate
        utterance.pitchMultiplier = speechPitch
        utterance.volume = speechVolume
        
        // Speak
        synthesizer.speak(utterance)
        errorMessage = ""
    }
    
    func speakWithPhonetics(_ text: String, phonetics: String? = nil, language: String? = nil) {
        // If phonetics are provided, use them for more accurate pronunciation
        if let phonetics = phonetics, !phonetics.isEmpty {
            speak(phonetics, language: language)
        } else {
            speak(text, language: language)
        }
    }
    
    func stop() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
    }
    
    func pause() {
        if synthesizer.isSpeaking {
            synthesizer.pauseSpeaking(at: .immediate)
        }
    }
    
    func resume() {
        if synthesizer.isPaused {
            synthesizer.continueSpeaking()
        }
    }
    
    func changeLanguage(to languageCode: String) {
        guard supportedLanguages.contains(languageCode) else {
            errorMessage = "Unsupported language: \(languageCode)"
            return
        }
        
        currentLanguage = languageCode
        errorMessage = ""
    }
    
    func updateSpeechSettings(rate: Float, pitch: Float, volume: Float) {
        speechRate = max(0.0, min(1.0, rate))
        speechPitch = max(0.5, min(2.0, pitch))
        speechVolume = max(0.0, min(1.0, volume))
    }
    
    func getAvailableVoices(for language: String) -> [AVSpeechSynthesisVoice] {
        return AVSpeechSynthesisVoice.speechVoices().filter { voice in
            voice.language.hasPrefix(language.prefix(2).lowercased())
        }
    }
    
    func demonstratePronunciation(word: String, phonetics: String? = nil, language: String? = nil) {
        let lang = language ?? currentLanguage
        
        // Speak the word slowly for demonstration
        let originalRate = speechRate
        speechRate = 0.3 // Slow down for demonstration
        
        speakWithPhonetics(word, phonetics: phonetics, language: lang)
        
        // Reset rate after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            self.speechRate = originalRate
        }
    }
}

// MARK: - AVSpeechSynthesizerDelegate
extension TTSService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        isSpeaking = true
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        isSpeaking = false
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) {
        // Handle pause if needed
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) {
        // Handle resume if needed
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        isSpeaking = false
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange, utterance: AVSpeechUtterance) {
        // Handle character range highlighting if needed for advanced features
    }
}

// MARK: - Language Support Extensions
extension TTSService {
    var languageDisplayNames: [String: String] {
        return [
            "en-US": "English (US)",
            "ja-JP": "日本語",
            "ko-KR": "한국어",
            "fr-FR": "Français",
            "zh-CN": "中文 (简体)"
        ]
    }
    
    func getLanguageDisplayName(_ code: String) -> String {
        return languageDisplayNames[code] ?? code
    }
}