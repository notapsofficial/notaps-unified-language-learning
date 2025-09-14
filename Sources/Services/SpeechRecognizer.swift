import Speech
import AVFoundation
import SwiftUI

@MainActor
class SpeechRecognizer: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var recognizedText = ""
    @Published var confidence: Float = 0.0
    @Published var errorMessage = ""
    
    private var audioEngine = AVAudioEngine()
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    
    // Supported languages for speech recognition
    private let supportedLanguages = ["en-US", "ja-JP", "ko-KR", "fr-FR", "zh-CN"]
    @Published var currentLanguage = "en-US"
    
    override init() {
        super.init()
        setupSpeechRecognizer()
    }
    
    private func setupSpeechRecognizer() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: currentLanguage))
        speechRecognizer?.delegate = self
    }
    
    func changeLanguage(to languageCode: String) {
        guard supportedLanguages.contains(languageCode) else {
            errorMessage = "Unsupported language: \(languageCode)"
            return
        }
        
        stopRecording()
        currentLanguage = languageCode
        setupSpeechRecognizer()
    }
    
    func startRecording() {
        // Check authorization
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            errorMessage = "Speech recognition not authorized"
            return
        }
        
        // Check if speech recognizer is available
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            errorMessage = "Speech recognizer not available"
            return
        }
        
        // Cancel any existing task
        stopRecording()
        
        // Configure audio session
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            errorMessage = "Audio session configuration failed: \(error.localizedDescription)"
            return
        }
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            errorMessage = "Unable to create recognition request"
            return
        }
        
        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = true // For privacy
        
        // Configure audio engine
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        // Start audio engine
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            errorMessage = "Audio engine start failed: \(error.localizedDescription)"
            return
        }
        
        // Start recognition
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            DispatchQueue.main.async {
                if let result = result {
                    self?.recognizedText = result.bestTranscription.formattedString
                    self?.confidence = result.bestTranscription.segments.first?.confidence ?? 0.0
                    
                    if result.isFinal {
                        self?.stopRecording()
                    }
                }
                
                if let error = error {
                    self?.errorMessage = "Recognition error: \(error.localizedDescription)"
                    self?.stopRecording()
                }
            }
        }
        
        isRecording = true
        errorMessage = ""
    }
    
    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        
        recognitionTask?.cancel()
        recognitionTask = nil
        
        isRecording = false
        
        // Reset audio session
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default)
        } catch {
            print("Failed to reset audio session: \(error)")
        }
    }
    
    func reset() {
        stopRecording()
        recognizedText = ""
        confidence = 0.0
        errorMessage = ""
    }
    
    // MARK: - Speech Analysis
    func analyzePronunciation(target: String, spoken: String) -> PronunciationAnalysis {
        let similarity = calculateSimilarity(target: target, spoken: spoken)
        let accuracy = similarity * 100
        
        return PronunciationAnalysis(
            targetText: target,
            spokenText: spoken,
            accuracy: accuracy,
            confidence: confidence,
            feedback: generateFeedback(accuracy: accuracy)
        )
    }
    
    private func calculateSimilarity(target: String, spoken: String) -> Float {
        let targetLower = target.lowercased().trimmingCharacters(in: .whitespacesAndPunctuation)
        let spokenLower = spoken.lowercased().trimmingCharacters(in: .whitespacesAndPunctuation)
        
        if targetLower == spokenLower {
            return 1.0
        }
        
        // Simple Levenshtein distance-based similarity
        let distance = levenshteinDistance(targetLower, spokenLower)
        let maxLength = max(targetLower.count, spokenLower.count)
        
        if maxLength == 0 {
            return 1.0
        }
        
        return max(0, 1.0 - Float(distance) / Float(maxLength))
    }
    
    private func levenshteinDistance(_ str1: String, _ str2: String) -> Int {
        let arr1 = Array(str1)
        let arr2 = Array(str2)
        
        var matrix = Array(repeating: Array(repeating: 0, count: arr2.count + 1), count: arr1.count + 1)
        
        for i in 0...arr1.count {
            matrix[i][0] = i
        }
        
        for j in 0...arr2.count {
            matrix[0][j] = j
        }
        
        for i in 1...arr1.count {
            for j in 1...arr2.count {
                let cost = arr1[i-1] == arr2[j-1] ? 0 : 1
                matrix[i][j] = min(
                    matrix[i-1][j] + 1,      // deletion
                    matrix[i][j-1] + 1,      // insertion
                    matrix[i-1][j-1] + cost  // substitution
                )
            }
        }
        
        return matrix[arr1.count][arr2.count]
    }
    
    private func generateFeedback(accuracy: Float) -> String {
        switch accuracy {
        case 90...100:
            return "完璧です！素晴らしい発音ですね。"
        case 80..<90:
            return "とても良い発音です。少し練習すればさらに良くなります。"
        case 70..<80:
            return "良い発音です。もう少し練習してみましょう。"
        case 60..<70:
            return "まずまずの発音です。もう一度挑戦してみてください。"
        default:
            return "もう一度ゆっくり発音してみてください。"
        }
    }
}

// MARK: - SFSpeechRecognizerDelegate
extension SpeechRecognizer: SFSpeechRecognizerDelegate {
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        DispatchQueue.main.async {
            if !available {
                self.errorMessage = "Speech recognizer became unavailable"
                self.stopRecording()
            }
        }
    }
}

// MARK: - Data Models
struct PronunciationAnalysis {
    let targetText: String
    let spokenText: String
    let accuracy: Float
    let confidence: Float
    let feedback: String
    
    var grade: String {
        switch accuracy {
        case 90...100: return "A"
        case 80..<90: return "B"
        case 70..<80: return "C"
        case 60..<70: return "D"
        default: return "F"
        }
    }
}