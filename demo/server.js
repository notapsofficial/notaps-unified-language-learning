const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sample vocabulary data (simulating the multilingual dictionary)
const sampleVocabulary = [
    {
        id: 1,
        word: "hello",
        pronunciation: "həˈloʊ",
        definition: "a greeting",
        language: "en",
        translations: {
            ja: { word: "こんにちは", pronunciation: "konnichiwa", definition: "挨拶" },
            ko: { word: "안녕하세요", pronunciation: "annyeonghaseyo", definition: "인사말" },
            fr: { word: "bonjour", pronunciation: "bonˈʒʊər", definition: "salutation" },
            zh: { word: "你好", pronunciation: "nǐ hǎo", definition: "问候语" }
        },
        difficulty: "beginner",
        category: "greetings"
    },
    {
        id: 2,
        word: "beautiful",
        pronunciation: "ˈbjutɪfəl",
        definition: "pleasing the senses or mind aesthetically",
        language: "en",
        translations: {
            ja: { word: "美しい", pronunciation: "utsukushii", definition: "美的に感覚や心を喜ばせる" },
            ko: { word: "아름다운", pronunciation: "areumdaun", definition: "감각이나 마음을 미적으로 기쁘게 하는" },
            fr: { word: "beau/belle", pronunciation: "bo/bɛl", definition: "qui plaît aux sens ou à l'esprit" },
            zh: { word: "美丽", pronunciation: "měi lì", definition: "在美学上令感官或心灵愉悦的" }
        },
        difficulty: "intermediate",
        category: "adjectives"
    },
    {
        id: 3,
        word: "opportunity",
        pronunciation: "ˌɒpəˈtunɪti",
        definition: "a set of circumstances that makes it possible to do something",
        language: "en",
        translations: {
            ja: { word: "機会", pronunciation: "kikai", definition: "何かをすることを可能にする状況" },
            ko: { word: "기회", pronunciation: "gihoe", definition: "어떤 일을 할 수 있게 해주는 상황" },
            fr: { word: "opportunité", pronunciation: "ɔpɔʁtyniˈte", definition: "ensemble de circonstances qui rend possible de faire quelque chose" },
            zh: { word: "机会", pronunciation: "jī huì", definition: "使某事成为可能的一系列情况" }
        },
        difficulty: "advanced",
        category: "nouns"
    }
];

// Sample learning progress data
let learningProgress = {
    currentLevel: 2,
    completedLessons: 15,
    pronunciationScore: 78.5,
    vocabularyMastered: 42,
    totalStudyTime: 1250, // minutes
    streakDays: 7
};

// API Routes
app.get('/api/vocabulary', (req, res) => {
    const { language, difficulty, limit } = req.query;
    let vocabulary = [...sampleVocabulary];
    
    if (language && language !== 'all') {
        vocabulary = vocabulary.filter(word => word.language === language);
    }
    
    if (difficulty && difficulty !== 'all') {
        vocabulary = vocabulary.filter(word => word.difficulty === difficulty);
    }
    
    if (limit) {
        vocabulary = vocabulary.slice(0, parseInt(limit));
    }
    
    res.json(vocabulary);
});

app.get('/api/progress', (req, res) => {
    res.json(learningProgress);
});

app.post('/api/practice/pronunciation', (req, res) => {
    const { targetText, spokenText } = req.body;
    
    // Simulate pronunciation analysis (in real app, this would use speech recognition)
    const similarity = calculateTextSimilarity(targetText.toLowerCase(), spokenText.toLowerCase());
    const accuracy = similarity * 100;
    
    let feedback = "";
    if (accuracy >= 90) {
        feedback = "完璧です！素晴らしい発音ですね。";
    } else if (accuracy >= 80) {
        feedback = "とても良い発音です。少し練習すればさらに良くなります。";
    } else if (accuracy >= 70) {
        feedback = "良い発音です。もう少し練習してみましょう。";
    } else if (accuracy >= 60) {
        feedback = "まずまずの発音です。もう一度挑戦してみてください。";
    } else {
        feedback = "もう一度ゆっくり発音してみてください。";
    }
    
    const analysis = {
        targetText,
        spokenText,
        accuracy: Math.round(accuracy),
        feedback,
        grade: accuracy >= 90 ? 'A' : accuracy >= 80 ? 'B' : accuracy >= 70 ? 'C' : accuracy >= 60 ? 'D' : 'F'
    };
    
    res.json(analysis);
});

app.post('/api/progress/update', (req, res) => {
    const { lesson, score, timeSpent } = req.body;
    
    // Update progress (in real app, this would update Core Data)
    if (score > learningProgress.pronunciationScore) {
        learningProgress.pronunciationScore = score;
    }
    learningProgress.completedLessons += 1;
    learningProgress.totalStudyTime += timeSpent || 5;
    
    res.json(learningProgress);
});

// Serve main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to calculate text similarity (simplified Levenshtein distance)
function calculateTextSimilarity(str1, str2) {
    const matrix = [];
    
    if (str1.length === 0) return str2.length === 0 ? 1 : 0;
    if (str2.length === 0) return 0;
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : Math.max(0, 1 - distance / maxLength);
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Notaps Unified Language Learning Demo running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
    console.log(`🎯 Features: Vocabulary Learning + Pronunciation Practice`);
    console.log(`🔧 Environment: Demo Web Version (iOS Swift logic simulated)`);
});