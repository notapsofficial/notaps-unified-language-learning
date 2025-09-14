// Notaps Unified Language Learning - Demo JavaScript

class NotapsApp {
    constructor() {
        this.currentTab = 'vocabulary'; // Start with vocabulary for TikTok-like experience
        this.vocabulary = [];
        this.progress = {};
        this.currentWord = null;
        this.currentVocabIndex = 0;
        this.isTransitioning = false;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.swipeThreshold = 50;
        this.autoProgressTimer = null;
        this.tabs = ['dashboard', 'vocabulary', 'pronunciation', 'progress', 'settings'];
        this.streakCount = parseInt(localStorage.getItem('learningStreak') || '0');
        this.sessionScore = 0;
        this.wordsStudiedToday = parseInt(localStorage.getItem('wordsStudiedToday') || '0');
        this.lastStudyDate = localStorage.getItem('lastStudyDate');
        this.favorites = new Set(JSON.parse(localStorage.getItem('favoriteWords') || '[]'));
        this.studyStats = JSON.parse(localStorage.getItem('studyStats') || '{}');
        
        // Language settings for focused vocabulary display
        this.userNativeLanguage = 'ja'; // User's native language (Japanese)
        this.learningLanguage = localStorage.getItem('learningLanguage') || 'en'; // User's selected study language
        
        // Vocabulary display modes
        this.vocabularyMode = localStorage.getItem('vocabularyMode') || 'auto'; // auto, manual, swipe
        this.autoProgressSpeed = parseInt(localStorage.getItem('autoProgressSpeed') || '3000'); // milliseconds
        
        // Expose app instance globally for onclick handlers
        window.app = this;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing NotapsApp...');
            this.setupEventListeners();
            this.setupSwipeGestures();
            this.checkDailyReset();
            
            console.log('Loading progress and vocabulary...');
            await this.loadProgress();
            await this.loadVocabulary();
            
            console.log('Updating dashboard and progress...');
            this.updateDashboard();
            this.updateProgressTab();
            
            console.log('Switching to vocabulary tab...');
            this.switchTab('vocabulary'); // Start with vocabulary mode
            
            console.log('Starting auto progression...');
            this.startAutoProgression();
            
            console.log('Showing welcome message...');
            this.showWelcomeMessage();
            
            console.log('App initialization complete!');
        } catch (error) {
            console.error('Error during app initialization:', error);
        }
    }

    setupEventListeners() {
        // Tab button click handlers
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = btn.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // Language setting handler
        const learningLanguageSelect = document.getElementById('learning-language');
        if (learningLanguageSelect) {
            // Set current value
            learningLanguageSelect.value = this.learningLanguage;
            
            learningLanguageSelect.addEventListener('change', (e) => {
                this.learningLanguage = e.target.value;
                localStorage.setItem('learningLanguage', this.learningLanguage);
                
                // Refresh vocabulary display
                if (this.currentTab === 'vocabulary') {
                    this.renderVocabularyTikTokStyle();
                }
                
                this.showNotification('学習言語を変更しました: ' + e.target.selectedOptions[0].text, 2000);
            });
        }

        // Minimal tap-based interactions (mostly for settings)
        const speechRate = document.getElementById('speech-rate');
        const speechPitch = document.getElementById('speech-pitch');
        
        if (speechRate) {
            speechRate.addEventListener('input', (e) => {
                document.getElementById('rate-value').textContent = e.target.value + 'x';
            });
        }
        
        if (speechPitch) {
            speechPitch.addEventListener('input', (e) => {
                document.getElementById('pitch-value').textContent = e.target.value + 'x';
            });
        }

        // Keyboard shortcuts for power users
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                if (this.currentTab === 'vocabulary' && (this.vocabularyMode === 'manual' || this.vocabularyMode === 'swipe')) {
                    this.previousVocabularyCard();
                } else if (this.currentTab !== 'vocabulary') {
                    this.previousContent();
                }
                // Do nothing for vocabulary + auto mode
            }
            if (e.key === 'ArrowDown') {
                if (this.currentTab === 'vocabulary' && (this.vocabularyMode === 'manual' || this.vocabularyMode === 'swipe')) {
                    this.nextVocabularyCard();
                } else if (this.currentTab !== 'vocabulary') {
                    this.nextContent();
                }
                // Do nothing for vocabulary + auto mode
            }
            if (e.key === 'ArrowLeft') this.previousTab();
            if (e.key === 'ArrowRight') this.nextTab();
            if (e.key === ' ') this.toggleAutoProgression();
        });
    }

    setupSwipeGestures() {
        const app = document.getElementById('app');
        
        // Touch start
        app.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            this.touchStartX = e.touches[0].clientX;
            this.pauseAutoProgression();
        }, { passive: true });
        
        // Touch move for real-time feedback
        app.addEventListener('touchmove', (e) => {
            if (this.isTransitioning) return;
            
            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            const deltaY = currentY - this.touchStartY;
            const deltaX = currentX - this.touchStartX;
            
            // Show preview of next/previous content
            if (Math.abs(deltaY) > Math.abs(deltaX) && this.currentTab === 'vocabulary' && this.vocabularyMode === 'swipe') {
                // Only show vertical preview in vocabulary swipe mode
                this.previewVerticalSwipe(deltaY);
            } else if (this.currentTab !== 'dashboard') {
                // Only show horizontal preview if not on dashboard
                this.previewHorizontalSwipe(deltaX);
            }
        }, { passive: true });
        
        // Touch end
        app.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const deltaY = touchEndY - this.touchStartY;
            const deltaX = touchEndX - this.touchStartX;
            
            this.resetPreview();
            
            // Determine swipe direction and execute
            if (Math.abs(deltaY) > Math.abs(deltaX) && this.currentTab === 'vocabulary' && this.vocabularyMode === 'swipe') {
                // Vertical swipe (only in vocabulary swipe mode)
                if (Math.abs(deltaY) > this.swipeThreshold) {
                    if (deltaY < 0) {
                        this.nextVocabularyCard(); // Swipe up = next word
                    } else {
                        this.previousVocabularyCard(); // Swipe down = previous word
                    }
                }
            } else if (Math.abs(deltaX) > Math.abs(deltaY) && this.currentTab !== 'dashboard') {
                // Horizontal swipe for tab switching
                if (Math.abs(deltaX) > this.swipeThreshold) {
                    if (deltaX < 0) {
                        this.previousTab(); // Swipe left = previous tab
                    } else {
                        this.nextTab(); // Swipe right = next tab
                    }
                }
            } else {
                // Horizontal swipe - disabled on dashboard to prevent accidental tab switching during scroll
                if (this.currentTab !== 'dashboard' && Math.abs(deltaX) > this.swipeThreshold) {
                    if (deltaX < 0) {
                        this.previousTab(); // Swipe left = previous tab
                    } else {
                        this.nextTab(); // Swipe right = next tab
                    }
                }
            }
            
            this.resumeAutoProgression();
        }, { passive: true });
        
        // Mouse support for desktop testing
        let isMouseDown = false;
        
        app.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            this.touchStartY = e.clientY;
            this.touchStartX = e.clientX;
            this.pauseAutoProgression();
        });
        
        app.addEventListener('mousemove', (e) => {
            if (!isMouseDown || this.isTransitioning) return;
            
            const deltaY = e.clientY - this.touchStartY;
            const deltaX = e.clientX - this.touchStartX;
            
            if (Math.abs(deltaY) > Math.abs(deltaX) && this.currentTab === 'vocabulary' && this.vocabularyMode === 'swipe') {
                // Only show vertical preview in vocabulary swipe mode
                this.previewVerticalSwipe(deltaY);
            } else if (this.currentTab !== 'dashboard') {
                // Only show horizontal preview if not on dashboard
                this.previewHorizontalSwipe(deltaX);
            }
        });
        
        app.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return;
            isMouseDown = false;
            
            const deltaY = e.clientY - this.touchStartY;
            const deltaX = e.clientX - this.touchStartX;
            
            this.resetPreview();
            
            // Determine swipe direction and execute - aligned with touch behavior
            if (Math.abs(deltaY) > Math.abs(deltaX) && this.currentTab === 'vocabulary' && this.vocabularyMode === 'swipe') {
                // Vertical swipe (only in vocabulary swipe mode)
                if (Math.abs(deltaY) > this.swipeThreshold) {
                    if (deltaY < 0) {
                        this.nextVocabularyCard(); // Swipe up = next word
                    } else {
                        this.previousVocabularyCard(); // Swipe down = previous word
                    }
                }
            } else if (Math.abs(deltaX) > Math.abs(deltaY) && this.currentTab !== 'dashboard') {
                // Horizontal swipe for tab switching
                if (Math.abs(deltaX) > this.swipeThreshold) {
                    if (deltaX < 0) {
                        this.previousTab(); // Swipe left = previous tab
                    } else {
                        this.nextTab(); // Swipe right = next tab
                    }
                }
            }
            
            this.resumeAutoProgression();
        });
    }

    switchTab(tabName, direction = 'none') {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        const currentContent = document.getElementById(this.currentTab);
        const nextContent = document.getElementById(tabName);
        
        // Add transition classes based on direction
        if (direction === 'left') {
            currentContent.classList.add('slide-out-right');
            nextContent.classList.add('slide-in-left');
        } else if (direction === 'right') {
            currentContent.classList.add('slide-out-left');
            nextContent.classList.add('slide-in-right');
        }
        
        // Update active tab button with animation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update active tab content
        setTimeout(() => {
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active', 'slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
            });
            nextContent.classList.add('active');
            
            this.currentTab = tabName;
            this.isTransitioning = false;
            
            // Load tab-specific content
            if (tabName === 'vocabulary') {
                this.renderVocabularyTikTokStyle();
            } else if (tabName === 'pronunciation') {
                this.loadRandomWord();
            } else if (tabName === 'progress') {
                this.updateProgressTab();
            }
        }, 300);
    }

    async loadProgress() {
        try {
            const response = await fetch('/api/progress');
            this.progress = await response.json();
        } catch (error) {
            console.error('Failed to load progress:', error);
            // Fallback to default progress
            this.progress = {
                currentLevel: 1,
                completedLessons: 0,
                pronunciationScore: 0,
                vocabularyMastered: 0,
                totalStudyTime: 0,
                streakDays: 0
            };
        }
    }

    async loadVocabulary() {
        try {
            const language = 'all'; // Simplified for demo
            const difficulty = 'all'; // Simplified for demo
            
            const response = await fetch(`/api/vocabulary?language=${language}&difficulty=${difficulty}&limit=10`);
            if (!response.ok) {
                throw new Error('Failed to fetch vocabulary');
            }
            this.vocabulary = await response.json();
            
            // Ensure we have vocabulary data
            if (!this.vocabulary || this.vocabulary.length === 0) {
                console.warn('No vocabulary data received');
                this.vocabulary = []; // Fallback to empty array
                return;
            }
            
            // Reset index if needed
            if (this.currentVocabIndex >= this.vocabulary.length) {
                this.currentVocabIndex = 0;
            }
            
            this.renderVocabulary();
        } catch (error) {
            console.error('Failed to load vocabulary:', error);
            // Provide fallback vocabulary data
            this.vocabulary = [
                {
                    id: 1,
                    word: "hello",
                    pronunciation: "həˈloʊ",
                    definition: "a greeting",
                    difficulty: "beginner",
                    category: "greetings",
                    translations: {
                        ja: { word: "こんにちは", pronunciation: "konnichiwa" }
                    }
                }
            ];
            this.renderVocabulary();
        }
    }

    filterVocabulary() {
        this.loadVocabulary();
    }

    renderVocabulary() {
        // Legacy method, now use TikTok style
        this.renderVocabularyTikTokStyle();
    }
    
    renderVocabularyTikTokStyle() {
        const container = document.getElementById('vocabulary-list');
        if (!container || this.vocabulary.length === 0) return;

        // Only clear and recreate if no card exists to prevent background flash
        let card = container.querySelector('.tiktok-vocab-card');
        if (!card) {
            container.innerHTML = '';
            container.className = 'tiktok-vocabulary-container';
            card = document.createElement('div');
            card.className = 'tiktok-vocab-card active';
            container.appendChild(card);
        }
        
        // Render current word in TikTok-like full screen format
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        // Initialize alternating display state if not set - always start with learning word
        if (this.showingNativeLanguage === undefined) {
            this.showingNativeLanguage = false;
        }
        
        // Pre-calculate dynamic values to avoid template literal issues
        const streakCount = this.streakCount || 0;
        const wordsStudiedToday = this.wordsStudiedToday || 0;
        const sessionScore = this.sessionScore || 0;
        const wordId = currentWord.id || currentWord.word;
        const isFavorite = this.favorites.has(wordId);
        const favoriteIcon = isFavorite ? '♥️' : '♡';
        
        // Generate content based on current display state
        let mainContent = '';
        if (this.showingNativeLanguage) {
            // Show native language translation
            const nativeTranslation = currentWord.translations[this.userNativeLanguage];
            if (nativeTranslation) {
                mainContent = `
                    <div class="vocab-word-large native-word">${nativeTranslation.word}</div>
                    <div class="vocab-pronunciation-large">/${nativeTranslation.pronunciation}/</div>
                `;
            }
        } else {
            // Show learning word
            mainContent = `
                <div class="vocab-word-large learning-word">${currentWord.word}</div>
                <div class="vocab-pronunciation-large">/${currentWord.pronunciation}/</div>
            `;
        }
        
        // Remove progress dots for cleaner display
        
        // Mode-specific hint text
        const getModeHint = () => {
            switch(this.vocabularyMode) {
                case 'auto': return '🎬 自動モード: 自動で単語が切り替わります';
                case 'manual': return '👆 マニュアルモード: ボタンで単語を切り替え';
                case 'swipe': return '📱 スワイプモード: 上下スワイプで単語切り替え';
                default: return '↑ 次の単語 | ↓ 前の単語 | ← → タブ切替';
            }
        };
        
        // Update card content without recreating the entire card element
        card.innerHTML = `
            <div class="vocabulary-mode-selector">
                <button class="mode-btn ${this.vocabularyMode === 'auto' ? 'active' : ''}" onclick="app.setVocabularyMode('auto')">
                    🎬 自動
                </button>
                <button class="mode-btn ${this.vocabularyMode === 'manual' ? 'active' : ''}" onclick="app.setVocabularyMode('manual')">
                    👆 手動
                </button>
                <button class="mode-btn ${this.vocabularyMode === 'swipe' ? 'active' : ''}" onclick="app.setVocabularyMode('swipe')">
                    📱 スワイプ
                </button>
            </div>
            
            <div class="tiktok-vocab-content">
                ${mainContent}
                
                <div class="vocab-meta-large">
                    <span class="difficulty-badge-large difficulty-${currentWord.difficulty}">
                        ${this.getDifficultyDisplayName(currentWord.difficulty)}
                    </span>
                    <span class="category-badge">${currentWord.category}</span>
                </div>
                
                <!-- Simplified display - removed stats and progress dots -->
            </div>
            
            <div class="side-actions" id="side-actions">
                ${this.vocabularyMode === 'manual' ? `
                    <button class="action-btn nav-btn" onclick="app.previousVocabularyCard()">
                        ⬆️
                    </button>
                    <button class="action-btn nav-btn" onclick="app.nextVocabularyCard()">
                        ⬇️
                    </button>
                ` : ''}
                <button class="action-btn speak-btn" onclick="app.speakCurrentWord()">
                    🔊
                </button>
                <button class="action-btn practice-btn" onclick="app.practiceCurrentWord()">
                    🎤
                </button>
                <button class="action-btn favorite-btn" onclick="app.toggleFavorite()">
                    ${favoriteIcon}
                </button>
                <button class="action-btn info-btn" onclick="app.showWordInfo()">
                    ℹ️
                </button>
            </div>
        `;
        
        // Auto-progression indicator removed for cleaner display
        
        // Setup auto-hide functionality for side actions
        setTimeout(() => this.setupSideActionsAutoHide(), 100);
    }
    
    setupSideActionsAutoHide() {
        const sideActions = document.getElementById('side-actions');
        if (!sideActions) return;
        
        // Clear any existing timer
        if (this.sideActionsTimer) {
            clearTimeout(this.sideActionsTimer);
        }
        
        // Start auto-hide timer (5 seconds)
        this.sideActionsTimer = setTimeout(() => {
            sideActions.classList.add('auto-hidden');
        }, 5000);
        
        // Add tap listener to vocabulary container to show side actions
        const vocabContainer = document.querySelector('.tiktok-vocabulary-container');
        if (vocabContainer) {
            // Remove existing listener to prevent duplicates
            vocabContainer.removeEventListener('click', this.showSideActionsHandler);
            
            // Store handler reference for removal
            this.showSideActionsHandler = () => {
                this.showSideActions();
            };
            
            vocabContainer.addEventListener('click', this.showSideActionsHandler);
        }
        
        // Reset timer on any user interaction
        const resetTimer = () => {
            this.showSideActions();
        };
        
        // Add interaction listeners to reset timer
        document.addEventListener('touchstart', resetTimer);
        document.addEventListener('mousemove', resetTimer);
        document.addEventListener('keydown', resetTimer);
    }
    
    showSideActions() {
        const sideActions = document.getElementById('side-actions');
        if (!sideActions) return;
        
        sideActions.classList.remove('auto-hidden');
        
        // Reset auto-hide timer
        if (this.sideActionsTimer) {
            clearTimeout(this.sideActionsTimer);
        }
        
        this.sideActionsTimer = setTimeout(() => {
            sideActions.classList.add('auto-hidden');
        }, 5000);
    }

    getDifficultyDisplayName(difficulty) {
        const map = {
            'beginner': '初級',
            'intermediate': '中級',
            'advanced': '上級'
        };
        return map[difficulty] || difficulty;
    }

    updateDashboard() {
        try {
            // Update learning streak
            const streakElement = document.getElementById('streak-days');
            if (streakElement) {
                streakElement.textContent = this.streakCount || 0;
            }

            // Update daily progress
            const progressElement = document.getElementById('daily-progress');
            if (progressElement) {
                const dailyGoal = 10; // Daily vocabulary goal
                progressElement.textContent = `${this.wordsStudiedToday}/${dailyGoal}`;
            }

            // Update social stats
            const globalRankElement = document.getElementById('global-rank');
            if (globalRankElement) {
                // Simulate ranking based on progress
                const rank = Math.max(1, 500 - (this.progress.vocabularyMastered || 0) * 5);
                globalRankElement.textContent = `#${rank}`;
            }

            const friendsElement = document.getElementById('friends-count');
            if (friendsElement) {
                friendsElement.textContent = '12'; // Demo value
            }

            const weeklyScoreElement = document.getElementById('weekly-score');
            if (weeklyScoreElement) {
                const weeklyScore = (this.wordsStudiedToday * 50) + (this.streakCount * 10);
                weeklyScoreElement.textContent = weeklyScore.toLocaleString();
            }

            // Generate language progress cards
            this.generateLanguageCards();
        } catch (error) {
            console.warn('Some dashboard elements not found:', error);
        }
    }

    updateProgressTab() {
        // Update progress charts
        const overallProgress = Math.min(100, (this.progress.completedLessons || 0) * 2);
        const pronunciationProgress = this.progress.pronunciationScore || 0;
        const vocabularyProgress = Math.min(100, (this.progress.vocabularyMastered || 0) * 2);

        setTimeout(() => {
            const overallBar = document.getElementById('overall-progress');
            const pronunciationBar = document.getElementById('pronunciation-progress');
            const vocabularyBar = document.getElementById('vocabulary-progress');

            if (overallBar) {
                overallBar.style.width = `${overallProgress}%`;
                document.getElementById('overall-percentage').textContent = `${Math.round(overallProgress)}%`;
            }

            if (pronunciationBar) {
                pronunciationBar.style.width = `${pronunciationProgress}%`;
                document.getElementById('pronunciation-percentage').textContent = `${Math.round(pronunciationProgress)}%`;
            }

            if (vocabularyBar) {
                vocabularyBar.style.width = `${vocabularyProgress}%`;
                document.getElementById('vocabulary-percentage').textContent = `${Math.round(vocabularyProgress)}%`;
            }
        }, 100);
    }

    loadRandomWord() {
        if (this.vocabulary.length > 0) {
            const randomWord = this.vocabulary[Math.floor(Math.random() * this.vocabulary.length)];
            this.currentWord = randomWord;
            
            const targetText = document.getElementById('target-text');
            const targetPronunciation = document.getElementById('target-pronunciation');
            
            if (targetText) targetText.textContent = randomWord.word;
            if (targetPronunciation) targetPronunciation.textContent = `/${randomWord.pronunciation}/`;
        }
    }
    
    // TikTok-style navigation methods
    nextContent() {
        if (this.isTransitioning) return;
        
        if (this.currentTab === 'vocabulary') {
            // No vocabulary navigation in nextContent - only for non-vocabulary tabs
            return;
        } else if (this.currentTab !== 'dashboard') {
            // For other tabs except dashboard, cycle through content if applicable
            this.nextTab();
        }
        // Dashboard tab: do nothing to prevent accidental tab switching during scroll
    }
    
    previousContent() {
        if (this.isTransitioning) return;
        
        if (this.currentTab === 'vocabulary') {
            // No vocabulary navigation in previousContent - only for non-vocabulary tabs
            return;
        } else if (this.currentTab !== 'dashboard') {
            // For other tabs except dashboard, cycle through content
            this.previousTab();
        }
        // Dashboard tab: do nothing to prevent accidental tab switching during scroll
    }
    
    nextVocabularyCard() {
        if (this.vocabulary.length === 0) return;
        
        // Correct alternating logic: word → translation → next word
        if (!this.showingNativeLanguage) {
            // Currently showing learning word, switch to native translation
            this.showingNativeLanguage = true;
        } else {
            // Currently showing native translation, move to next word and show learning word
            this.currentVocabIndex = (this.currentVocabIndex + 1) % this.vocabulary.length;
            this.showingNativeLanguage = false;
        }
        
        this.animateVocabularyTransition('up');
        this.updateStudyStats();
        this.showEncouragement();
    }
    
    previousVocabularyCard() {
        if (this.vocabulary.length === 0) return;
        
        // Correct alternating logic: translation → word → previous word  
        if (this.showingNativeLanguage) {
            // Currently showing native translation, switch to learning word
            this.showingNativeLanguage = false;
        } else {
            // Currently showing learning word, move to previous word and show translation
            this.currentVocabIndex = this.currentVocabIndex === 0 
                ? this.vocabulary.length - 1 
                : this.currentVocabIndex - 1;
            this.showingNativeLanguage = true;
        }
        
        this.animateVocabularyTransition('down');
    }
    
    nextTab() {
        const currentIndex = this.tabs.indexOf(this.currentTab);
        const nextIndex = (currentIndex + 1) % this.tabs.length;
        this.switchTab(this.tabs[nextIndex], 'left');
    }
    
    previousTab() {
        const currentIndex = this.tabs.indexOf(this.currentTab);
        const prevIndex = currentIndex === 0 ? this.tabs.length - 1 : currentIndex - 1;
        this.switchTab(this.tabs[prevIndex], 'right');
    }
    
    animateVocabularyTransition(direction) {
        this.isTransitioning = true;
        
        // Only update word content without affecting the card background
        const wordContent = document.querySelector('.tiktok-vocab-content');
        if (!wordContent) {
            // Fallback to full render if content area not found
            this.renderVocabularyTikTokStyle();
            this.isTransitioning = false;
            return;
        }
        
        // Smooth fade transition on content only, preserving background
        wordContent.style.opacity = '0.2';
        wordContent.style.transition = 'opacity 0.15s ease';
        
        setTimeout(() => {
            this.updateWordContent();
            // Fade back in smoothly
            wordContent.style.opacity = '1';
            setTimeout(() => {
                this.isTransitioning = false;
            }, 150);
        }, 150);
    }
    
    updateWordContent() {
        // Update only the word content without touching the card structure
        const wordContent = document.querySelector('.tiktok-vocab-content');
        if (!wordContent) return;
        
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        // Find text elements to animate
        const wordElement = wordContent.querySelector('.vocab-word-large');
        const pronunciationElement = wordContent.querySelector('.vocab-pronunciation-large');
        
        if (wordElement && pronunciationElement) {
            // Fade out current text
            wordElement.style.transition = 'opacity 0.15s ease';
            pronunciationElement.style.transition = 'opacity 0.15s ease';
            wordElement.style.opacity = '0';
            pronunciationElement.style.opacity = '0';
            
            setTimeout(() => {
                // Update content after fade out
                this.updateTextContent(wordContent, currentWord);
                
                // Fade in new text
                const newWordElement = wordContent.querySelector('.vocab-word-large');
                const newPronunciationElement = wordContent.querySelector('.vocab-pronunciation-large');
                
                if (newWordElement && newPronunciationElement) {
                    newWordElement.style.opacity = '0';
                    newPronunciationElement.style.opacity = '0';
                    
                    setTimeout(() => {
                        newWordElement.style.transition = 'opacity 0.15s ease';
                        newPronunciationElement.style.transition = 'opacity 0.15s ease';
                        newWordElement.style.opacity = '1';
                        newPronunciationElement.style.opacity = '1';
                    }, 10);
                }
            }, 150);
        } else {
            // First time or fallback - just update content
            this.updateTextContent(wordContent, currentWord);
        }
        
        // Update favorite button in side actions
        this.updateFavoriteButton();
    }
    
    updateTextContent(wordContent, currentWord) {
        // Generate content based on current display state
        let mainContent = '';
        if (this.showingNativeLanguage) {
            // Show native language translation
            const nativeTranslation = currentWord.translations[this.userNativeLanguage];
            if (nativeTranslation) {
                mainContent = `
                    <div class="vocab-word-large native-word">${nativeTranslation.word}</div>
                    <div class="vocab-pronunciation-large">/${nativeTranslation.pronunciation}/</div>
                `;
            }
        } else {
            // Show learning word
            mainContent = `
                <div class="vocab-word-large learning-word">${currentWord.word}</div>
                <div class="vocab-pronunciation-large">/${currentWord.pronunciation}/</div>
            `;
        }
        
        // Update only the content area
        wordContent.innerHTML = `
            ${mainContent}
            
            <div class="vocab-meta-large">
                <span class="difficulty-badge-large difficulty-${currentWord.difficulty}">
                    ${this.getDifficultyDisplayName(currentWord.difficulty)}
                </span>
                <span class="category-badge">${currentWord.category}</span>
            </div>
        `;
    }
    
    // Removed unused animation functions - using simple fade in animateVocabularyTransition
    
    previewVerticalSwipe(deltaY) {
        const container = document.getElementById('vocabulary-list');
        if (!container) return;
        
        const progress = Math.min(Math.abs(deltaY) / this.swipeThreshold, 1);
        const translateY = deltaY * 0.3; // Dampened movement
        
        container.style.transform = `translateY(${translateY}px)`;
        container.style.opacity = 1 - (progress * 0.2);
    }
    
    previewHorizontalSwipe(deltaX) {
        const currentContent = document.getElementById(this.currentTab);
        if (!currentContent) return;
        
        const progress = Math.min(Math.abs(deltaX) / this.swipeThreshold, 1);
        const translateX = deltaX * 0.3;
        
        currentContent.style.transform = `translateX(${translateX}px)`;
        currentContent.style.opacity = 1 - (progress * 0.2);
    }
    
    resetPreview() {
        const container = document.getElementById('vocabulary-list');
        const currentContent = document.getElementById(this.currentTab);
        
        if (container) {
            container.style.transform = 'translateY(0)';
            container.style.opacity = '1';
        }
        
        if (currentContent) {
            currentContent.style.transform = 'translateX(0)';
            currentContent.style.opacity = '1';
        }
    }
    
    // Auto-progression features
    startAutoProgression() {
        // Clear any existing timer first
        this.pauseAutoProgression();
        
        // Only start auto progression in auto mode
        if (this.vocabularyMode === 'auto' && this.currentTab === 'vocabulary' && this.vocabulary && this.vocabulary.length > 0) {
            this.autoProgressTimer = setInterval(() => {
                this.nextVocabularyCard();
            }, this.autoProgressSpeed);
        }
    }
    
    pauseAutoProgression() {
        if (this.autoProgressTimer) {
            clearInterval(this.autoProgressTimer);
            this.autoProgressTimer = null;
        }
    }
    
    resumeAutoProgression() {
        setTimeout(() => {
            if (this.currentTab === 'vocabulary' && this.vocabularyMode === 'auto') {
                this.startAutoProgression();
            }
        }, 2000); // Resume after 2 seconds
    }
    
    setVocabularyMode(mode) {
        if (['auto', 'manual', 'swipe'].includes(mode)) {
            this.vocabularyMode = mode;
            localStorage.setItem('vocabularyMode', mode);
            
            // Update auto progression based on mode
            if (mode === 'auto') {
                this.startAutoProgression();
            } else {
                this.pauseAutoProgression();
            }
            
            // Update UI without full re-render to prevent background flash
            if (this.currentTab === 'vocabulary') {
                this.updateModeSelector();
                this.updateSideActions();
            }
            
            // Show notification below mode selector instead of toast
            this.showModeChangeNotification(mode);
        }
    }
    
    toggleAutoProgression() {
        if (this.autoProgressTimer) {
            this.pauseAutoProgression();
        } else {
            this.startAutoProgression();
        }
    }
    
    // Utility methods for TikTok-style interactions
    vibrate(pattern = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
    
    playSwipeSound(type = 'next') {
        if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(type === 'back' ? 800 : 1200, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Silently fail if audio context creation fails
        }
    }
    
    playSuccessSound() {
        if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Play a cheerful chord
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
            
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Silently fail if audio context creation fails
        }
    }
    
    showNotification(message, duration = 2000) {
        // Remove existing notification
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Animate out
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    showModeChangeNotification(mode) {
        // Remove existing mode notification
        const existing = document.querySelector('.mode-change-notification');
        if (existing) existing.remove();
        
        const modeNames = {
            'auto': '自動',
            'manual': '手動', 
            'swipe': 'スワイプ'
        };
        
        const notification = document.createElement('div');
        notification.className = 'mode-change-notification';
        notification.textContent = `モードを${modeNames[mode]}に変更しました`;
        
        // Insert after mode selector
        const modeSelector = document.querySelector('.vocabulary-mode-selector');
        if (modeSelector && modeSelector.parentNode) {
            modeSelector.parentNode.insertBefore(notification, modeSelector.nextSibling);
        }
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Animate out after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 2000);
    }
    
    updateModeSelector() {
        // Update mode selector buttons without full re-render
        const buttons = document.querySelectorAll('.mode-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if ((btn.textContent.includes('自動') && this.vocabularyMode === 'auto') ||
                (btn.textContent.includes('手動') && this.vocabularyMode === 'manual') ||
                (btn.textContent.includes('スワイプ') && this.vocabularyMode === 'swipe')) {
                btn.classList.add('active');
            }
        });
    }
    
    updateSideActions() {
        // Update side actions without full re-render
        const sideActions = document.getElementById('side-actions');
        if (!sideActions) return;
        
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        const wordId = currentWord.id || currentWord.word;
        const isFavorite = this.favorites.has(wordId);
        const favoriteIcon = isFavorite ? '♥️' : '♡';
        
        sideActions.innerHTML = `
            ${this.vocabularyMode === 'manual' ? `
                <button class="action-btn nav-btn" onclick="app.previousVocabularyCard()">
                    ⬆️
                </button>
                <button class="action-btn nav-btn" onclick="app.nextVocabularyCard()">
                    ⬇️
                </button>
            ` : ''}
            <button class="action-btn speak-btn" onclick="app.speakCurrentWord()">
                🔊
            </button>
            <button class="action-btn practice-btn" onclick="app.practiceCurrentWord()">
                🎤
            </button>
            <button class="action-btn favorite-btn" onclick="app.toggleFavorite()">
                ${favoriteIcon}
            </button>
            <button class="action-btn info-btn" onclick="app.showWordInfo()">
                ℹ️
            </button>
        `;
        
        // Preserve auto-hide functionality for side actions
        setTimeout(() => this.setupSideActionsAutoHide(), 50);
    }
    
    showEncouragement() {
        // Disabled motivational messages to maintain concentration during learning
        // 集中力を保つため励ましメッセージを無効化
        return;
    }
    
    updateStudyStats() {
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        const wordKey = currentWord.word;
        this.studyStats[wordKey] = this.studyStats[wordKey] || { views: 0, practiced: 0 };
        this.studyStats[wordKey].views += 1;
        
        this.wordsStudiedToday += 1;
        this.sessionScore += 10;
        
        // Save to localStorage
        localStorage.setItem('studyStats', JSON.stringify(this.studyStats));
        localStorage.setItem('wordsStudiedToday', this.wordsStudiedToday.toString());
        localStorage.setItem('lastStudyDate', new Date().toDateString());
        
        // Update streak
        this.updateStreak();
        
        // Achievement check
        this.checkAchievements();
    }
    
    updateStreak() {
        const today = new Date().toDateString();
        const lastDate = this.lastStudyDate;
        
        if (!lastDate || lastDate !== today) {
            if (this.isConsecutiveDay(lastDate)) {
                this.streakCount += 1;
            } else {
                this.streakCount = 1;
            }
            localStorage.setItem('learningStreak', this.streakCount.toString());
        }
    }
    
    isConsecutiveDay(lastDate) {
        if (!lastDate) return false;
        
        const last = new Date(lastDate);
        const today = new Date();
        const diffTime = today.getTime() - last.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays === 1;
    }
    
    checkDailyReset() {
        const today = new Date().toDateString();
        const lastDate = this.lastStudyDate;
        
        if (lastDate !== today) {
            this.wordsStudiedToday = 0;
            this.sessionScore = 0;
            localStorage.setItem('wordsStudiedToday', '0');
        }
    }
    
    checkAchievements() {
        // Disabled achievement notifications to maintain focus during learning
        // 学習中の集中力を保つため達成通知を無効化
        if (this.wordsStudiedToday === 10) {
            // this.showNotification('🏆 今日の目標達成！', 3000);
            this.playSuccessSound();
            this.vibrate([100, 50, 100]);
        }
        
        if (this.streakCount === 7) {
            // this.showNotification('🔥 7日連続達成！', 3000);
            this.playSuccessSound();
        }
        
        if (this.favorites.size === 5) {
            // this.showNotification('♥️ お気に入り5個達成！', 3000);
        }
    }
    
    updateFavoriteButton() {
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        const favoriteBtn = document.querySelector('.favorite-btn');
        if (favoriteBtn) {
            const wordId = currentWord.id || currentWord.word;
            favoriteBtn.textContent = this.favorites.has(wordId) ? '♥️' : '♡';
        }
    }
    
    showWelcomeMessage() {
        // Disabled welcome messages to avoid interrupting concentration
        // 集中力を妨げないようウェルカムメッセージを無効化
        // setTimeout(() => {
        //     if (this.streakCount > 0) {
        //         this.showNotification(`🔥 ${this.streakCount}日連続中！継続しましょう！`, 3000);
        //     } else {
        //         this.showNotification('🎆 学習を始めましょう！', 2000);
        //     }
        // }, 1000);
    }
    
    getLanguageFlag(langCode) {
        // Remove flags for native language (Japanese) as requested
        if (langCode === this.userNativeLanguage) {
            return '';
        }
        const flags = {
            'en': '🇺🇸',
            'ja': '',  // No flag for Japanese
            'ko': '🇰🇷',
            'fr': '🇫🇷',
            'zh': '🇨🇳'
        };
        return flags[langCode] || '🌐';
    }
    
    speakCurrentWord() {
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if ('speechSynthesis' in window && currentWord) {
            const utterance = new SpeechSynthesisUtterance(currentWord.word);
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
            this.vibrate();
        }
    }
    
    practiceCurrentWord() {
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (currentWord) {
            this.currentWord = currentWord;
            this.switchTab('pronunciation');
            setTimeout(() => {
                const targetText = document.getElementById('target-text');
                const targetPronunciation = document.getElementById('target-pronunciation');
                
                if (targetText) targetText.textContent = currentWord.word;
                if (targetPronunciation) targetPronunciation.textContent = `/${currentWord.pronunciation}/`;
            }, 300);
        }
    }
    
    toggleFavorite() {
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        const wordId = currentWord.id || currentWord.word;
        
        if (this.favorites.has(wordId)) {
            this.favorites.delete(wordId);
            this.showNotification('♡ お気に入りから削除しました');
        } else {
            this.favorites.add(wordId);
            this.showNotification('♥️ お気に入りに追加しました！');
            this.playSuccessSound();
        }
        
        localStorage.setItem('favoriteWords', JSON.stringify([...this.favorites]));
        this.updateFavoriteButton();
        this.vibrate();
    }
    
    showWordInfo() {
        const currentWord = this.vocabulary[this.currentVocabIndex];
        if (!currentWord) return;
        
        const stats = this.studyStats[currentWord.word] || { views: 0, practiced: 0 };
        
        const info = `
        📊 学習統計:
        • 閲覧回数: ${stats.views}回
        • 練習回数: ${stats.practiced}回
        • カテゴリ: ${currentWord.category}
        • 難易度: ${this.getDifficultyDisplayName(currentWord.difficulty)}
        `;
        
        this.showNotification(info, 3000);
        this.vibrate();
    }

    practiceWord(word, pronunciation) {
        this.currentWord = { word, pronunciation };
        this.switchTab('pronunciation');
        setTimeout(() => {
            const targetText = document.getElementById('target-text');
            const targetPronunciation = document.getElementById('target-pronunciation');
            
            if (targetText) targetText.textContent = word;
            if (targetPronunciation) targetPronunciation.textContent = `/${pronunciation}/`;
        }, 300);
    }

    playTargetAudio() {
        if ('speechSynthesis' in window && this.currentWord) {
            const utterance = new SpeechSynthesisUtterance(this.currentWord.word);
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        } else {
            alert('音声合成がサポートされていません。');
        }
    }

    async analyzePronunciation() {
        const targetText = document.getElementById('target-text').textContent;
        const spokenText = document.getElementById('spoken-input').value.trim();

        if (!spokenText) {
            alert('発音内容を入力してください。');
            return;
        }

        try {
            const response = await fetch('/api/practice/pronunciation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetText,
                    spokenText
                })
            });

            const analysis = await response.json();
            this.displayPronunciationResult(analysis);
            
            // Update progress
            await this.updateLearningProgress(analysis.accuracy);
            
        } catch (error) {
            console.error('Pronunciation analysis failed:', error);
            alert('発音分析に失敗しました。');
        }
    }

    displayPronunciationResult(analysis) {
        const resultArea = document.getElementById('pronunciation-result');
        resultArea.style.display = 'block';

        document.getElementById('accuracy-score').textContent = `${analysis.accuracy}%`;
        document.getElementById('pronunciation-grade').textContent = analysis.grade;
        document.getElementById('pronunciation-feedback').textContent = analysis.feedback;

        // Update grade color
        const gradeElement = document.getElementById('pronunciation-grade');
        gradeElement.className = 'grade';
        if (analysis.accuracy >= 90) {
            gradeElement.style.background = '#28a745';
        } else if (analysis.accuracy >= 80) {
            gradeElement.style.background = '#17a2b8';
        } else if (analysis.accuracy >= 70) {
            gradeElement.style.background = '#ffc107';
        } else {
            gradeElement.style.background = '#dc3545';
        }

        // Scroll to result
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    async updateLearningProgress(score) {
        try {
            const response = await fetch('/api/progress/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lesson: 'pronunciation',
                    score: score,
                    timeSpent: 5
                })
            });

            this.progress = await response.json();
            this.updateDashboard();
        } catch (error) {
            console.error('Failed to update progress:', error);
        }
    }

    startReview() {
        this.switchTab('vocabulary');
        // Could implement specific review logic here
    }

    startTest() {
        alert('テスト機能は開発中です。');
        // Could implement test functionality here
    }

    // New Dashboard Functions for Multilingual LTV Optimization

    generateLanguageCards() {
        const languageCardsContainer = document.getElementById('language-cards');
        if (!languageCardsContainer) return;

        // Demo languages with progress simulation
        const activeLanguages = [
            {
                code: 'en',
                name: 'English',
                flag: '🇺🇸',
                progress: Math.min(100, (this.progress.vocabularyMastered || 0) * 4),
                level: 'Intermediate',
                wordsLearned: this.progress.vocabularyMastered || 0
            },
            {
                code: 'ja',
                name: '日本語',
                flag: '🇯🇵',
                progress: 75,
                level: 'Advanced',
                wordsLearned: 450
            },
            {
                code: 'ko',
                name: '한국어',
                flag: '🇰🇷',
                progress: 30,
                level: 'Beginner',
                wordsLearned: 120
            }
        ];

        languageCardsContainer.innerHTML = activeLanguages.map(lang => `
            <div class="language-card" onclick="app.selectLanguage('${lang.code}')">
                <div class="language-flag">${lang.flag}</div>
                <div class="language-name">${lang.name}</div>
                <div class="language-progress">${lang.progress}% 完了</div>
                <div class="language-level">${lang.level}</div>
            </div>
        `).join('');
    }

    selectLanguage(languageCode) {
        console.log(`Switching to language: ${languageCode}`);
        // Switch to vocabulary learning for selected language
        this.currentLanguage = languageCode;
        this.switchTab('vocabulary');
        this.showToast(`${languageCode.toUpperCase()} 学習モードに切り替えました`);
    }

    showLanguageDetails() {
        alert('言語詳細機能を開発中です。\n\n今後の機能:\n• 詳細な進捗グラフ\n• 習得スキル分析\n• 学習目標設定\n• カスタム復習プラン');
    }

    showAddLanguage() {
        const availableLanguages = [
            '🇫🇷 French (Français)',
            '🇨🇳 Chinese (中文)',
            '🇩🇪 German (Deutsch)',
            '🇪🇸 Spanish (Español)',
            '🇮🇹 Italian (Italiano)',
            '🇷🇺 Russian (Русский)',
            '🇵🇹 Portuguese (Português)',
            '🇳🇱 Dutch (Nederlands)'
        ];
        
        const languageList = availableLanguages.join('\n• ');
        
        alert(`新しい言語を追加\n\n利用可能な言語:\n• ${languageList}\n\n✨ 各言語で数千の単語と表現を学習\n📈 AIパーソナライズ学習\n🎯 目標設定と進捗追跡\n\n無料で今すぐ開始できます！`);
    }

    showPremiumFeatures() {
        alert(`🌟 Notaps Premium\n\n以下の機能で学習効率を最大化:\n\n📊 詳細分析レポート\n• 習得速度分析\n• 弱点特定\n• 学習パターン最適化\n\n🎯 個人専用学習プラン\n• AI学習コーチ\n• カスタム目標設定\n• 適応型カリキュラム\n\n🔄 無制限復習モード\n• スマート復習システム\n• 忘却曲線最適化\n• カスタム復習間隔\n\n🎤 AI発音コーチ\n• リアルタイム発音分析\n• アクセント改善\n• ネイティブ比較\n\n💎 7日間無料体験開始`);
    }

    showLeaderboard() {
        const mockLeaderboard = [
            '🥇 田中太郎 - 2,847 pts',
            '🥈 Smith John - 2,693 pts',
            '🥉 김민수 - 2,541 pts',
            '4️⃣ あなた - 1,247 pts',
            '5️⃣ Marie Dupont - 1,156 pts',
            '6️⃣ Chen Wei - 1,089 pts',
            '7️⃣ Anna Schmidt - 987 pts'
        ];

        alert(`🏆 今週のランキング\n\n${mockLeaderboard.join('\n')}\n\n🔥 連続学習でポイントアップ！\n📚 新しい言語でボーナスポイント獲得\n👥 友達を招待してランキング上昇`);
    }

    showToast(message, duration = 3000) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// Initialize app when DOM is loaded
let app;

// Global functions for HTML onclick events (with safety checks)
function switchTab(tabName) {
    if (app && app.switchTab) {
        app.switchTab(tabName);
    } else {
        console.log('App not ready yet, retrying...');
        setTimeout(() => switchTab(tabName), 100);
    }
}

function playTargetAudio() {
    if (app && app.playTargetAudio) {
        app.playTargetAudio();
    }
}

function analyzePronunciation() {
    if (app && app.analyzePronunciation) {
        app.analyzePronunciation();
    }
}

function startReview() {
    if (app && app.startReview) {
        app.startReview();
    }
}

function startTest() {
    if (app && app.startTest) {
        app.startTest();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        app = new NotapsApp();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

// Service Worker registration disabled for demo
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/sw.js')
//             .then(registration => {
//                 console.log('SW registered: ', registration);
//             })
//             .catch(registrationError => {
//                 console.log('SW registration failed: ', registrationError);
//             });
//     });
// }