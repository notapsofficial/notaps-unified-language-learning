import SwiftUI

// Main content view for the unified language learning app
struct ContentView: View {
    @EnvironmentObject var speechAuthManager: SpeechAuthManager
    @EnvironmentObject var audioSessionManager: AudioSessionManager
    @EnvironmentObject var learningProgressManager: LearningProgressManager
    
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home/Dashboard Tab
            DashboardView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("ホーム")
                }
                .tag(0)
            
            // Vocabulary Learning Tab
            VocabularyView()
                .tabItem {
                    Image(systemName: "book.fill")
                    Text("語彙")
                }
                .tag(1)
            
            // Pronunciation Practice Tab
            PronunciationView()
                .tabItem {
                    Image(systemName: "mic.fill")
                    Text("発音")
                }
                .tag(2)
            
            // Progress Tracking Tab
            ProgressView()
                .tabItem {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("進捗")
                }
                .tag(3)
            
            // Settings Tab
            SettingsView()
                .tabItem {
                    Image(systemName: "gearshape.fill")
                    Text("設定")
                }
                .tag(4)
        }
        .accentColor(.blue)
        .onAppear {
            learningProgressManager.loadProgress()
        }
    }
}

// MARK: - Dashboard View
struct DashboardView: View {
    @EnvironmentObject var learningProgressManager: LearningProgressManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome Section
                    VStack(alignment: .leading, spacing: 10) {
                        Text("今日の学習")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("継続は力なり - 今日も頑張りましょう！")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Quick Stats
                    HStack(spacing: 15) {
                        StatCard(title: "レベル", value: "\(learningProgressManager.currentLevel)", color: .blue)
                        StatCard(title: "完了", value: "\(learningProgressManager.completedLessons)", color: .green)
                        StatCard(title: "発音", value: String(format: "%.1f%%", learningProgressManager.pronunciationScore), color: .orange)
                    }
                    
                    // Quick Actions
                    VStack(spacing: 15) {
                        Text("クイックアクション")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 15) {
                            QuickActionCard(
                                title: "今日の単語",
                                subtitle: "新しい語彙を学ぶ",
                                icon: "book.fill",
                                color: .purple
                            )
                            
                            QuickActionCard(
                                title: "発音練習",
                                subtitle: "音声認識で練習",
                                icon: "mic.fill",
                                color: .red
                            )
                            
                            QuickActionCard(
                                title: "復習",
                                subtitle: "既習単語の復習",
                                icon: "arrow.clockwise",
                                color: .blue
                            )
                            
                            QuickActionCard(
                                title: "テスト",
                                subtitle: "理解度チェック",
                                icon: "checkmark.circle.fill",
                                color: .green
                            )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Notaps Learning")
        }
    }
}

// MARK: - Supporting Views
struct StatCard: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

struct QuickActionCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundColor(color)
            
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
            
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 120)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Placeholder Views (will be implemented in detail later)
struct VocabularyView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("語彙学習")
                    .font(.largeTitle)
                    .padding()
                Text("多言語辞書システム（実装予定）")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Vocabulary")
        }
    }
}

struct PronunciationView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("発音練習")
                    .font(.largeTitle)
                    .padding()
                Text("Apple Intelligence音声分析（実装予定）")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Pronunciation")
        }
    }
}

struct ProgressView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("学習進捗")
                    .font(.largeTitle)
                    .padding()
                Text("Core Data統計（実装予定）")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Progress")
        }
    }
}

struct SettingsView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("設定")
                    .font(.largeTitle)
                    .padding()
                Text("アプリ設定とプレミアム機能（実装予定）")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Settings")
        }
    }
}