# Notaps Unified Language Learning

## Overview

Notaps Unified Language Learning is a unified iOS language learning application created by integrating two existing Swift apps: NotapsStudyENJP (English-Japanese vocabulary learning) and SoliloquyMirror (pronunciation practice). The project combines vocabulary learning and pronunciation practice into a single, comprehensive learning platform that operates entirely locally on iPhone devices using Apple Intelligence.

This repository contains both the native iOS Swift implementation and a web-based demonstration prototype. The web demo simulates the iOS functionality and provides a working preview of the integrated learning experience with vocabulary study, pronunciation practice, progress tracking, and settings management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (September 13, 2025)

- ✅ Successfully integrated NotapsStudyENJP and SoliloquyMirror functionality into unified app structure
- ✅ Created comprehensive web demo running on port 5000 with Express.js backend
- ✅ Implemented SwiftUI-based iOS app architecture with speech recognition and TTS services
- ✅ Developed multilingual vocabulary system supporting English, Japanese, Korean, French, and Chinese
- ✅ Added pronunciation practice with simulated accuracy scoring and feedback
- ✅ Created progress tracking system with learning statistics and achievement metrics
- 🔧 Architecture review completed: Core functionality working, some iOS integrations need refinement

## System Architecture

### Native iOS Architecture (Swift/SwiftUI)
The main iOS application follows modern SwiftUI patterns with:

- **SwiftUI App Structure**: Main app (`NotapsUnifiedApp.swift`) with tabbed interface and navigation
- **Service Layer**: Speech recognition (`SpeechRecognizer.swift`) and text-to-speech (`TTSService.swift`) services
- **Data Models**: Vocabulary and progress models (`VocabularyModels.swift`) with Core Data integration
- **Apple Intelligence Integration**: On-device speech processing and pronunciation analysis
- **Local Storage**: All data stored locally using Core Data for vocabulary and progress tracking

### Web Demo Architecture (Node.js/Express)
The demonstration web application uses a vanilla JavaScript SPA architecture:

- **Component-based Structure**: Single `NotapsApp` class managing tabs (dashboard, vocabulary, pronunciation, progress, settings)
- **Mobile-first Design**: CSS styled for mobile devices with 420px max-width to simulate iOS experience
- **Progressive Enhancement**: Modern JavaScript with graceful fallbacks for older browsers
- **State Management**: Local state management with browser API persistence

### Demo Backend Architecture
The web demo backend uses Express.js for simulation:

- **RESTful API Simulation**: Express server providing JSON endpoints for vocabulary and progress data
- **Static File Serving**: Serves demo frontend assets from public directory
- **CORS Enabled**: Configured for development and testing purposes
- **In-memory Sample Data**: Hardcoded multilingual vocabulary for demonstration
- **Pronunciation Analysis Simulation**: Text similarity algorithm simulating speech recognition

### Data Model
The vocabulary data structure supports multilingual learning with:

- **Hierarchical Translation System**: Each word contains translations for multiple languages with pronunciation guides
- **Metadata Support**: Includes difficulty levels, categories, and learning progress tracking
- **Extensible Schema**: Designed to accommodate additional languages and learning metrics

### User Interface Design
The interface employs a native mobile app aesthetic:

- **Tab-based Navigation**: Five main sections (Dashboard, Vocabulary, Pronunciation, Progress, Settings)
- **Japanese Localization**: Primary UI language is Japanese with emoji-enhanced navigation
- **Responsive Components**: Grid-based layouts that adapt to different screen sizes
- **Accessibility Features**: Semantic HTML structure and keyboard navigation support

## External Dependencies

### iOS Native Dependencies
- **SwiftUI**: User interface framework for iOS app development
- **Speech Framework**: Apple's speech recognition and synthesis APIs
- **Core Data**: Local data persistence and management
- **Core ML**: Machine learning model integration for pronunciation analysis
- **StoreKit 2**: In-app purchase and subscription management
- **AVFoundation**: Audio session management and media handling

### Web Demo Dependencies
- **Express.js (^4.18.2)**: Web server framework for demo backend
- **CORS (^2.8.5)**: Cross-Origin Resource Sharing middleware
- **Path (^0.12.7)**: Node.js path utilities for file operations

### Browser APIs (Demo)
- **Web Speech API**: Browser speech recognition and synthesis (planned enhancement)
- **Local Storage API**: Demo progress and settings persistence
- **Fetch API**: Communication between frontend and backend services

### Revenue Model Integration
- **StoreKit 2**: Premium feature unlocking via App Store purchases
- **Apple Intelligence**: Local processing ensures privacy and reduces server costs
- **Freemium Model**: Basic features free, advanced pronunciation analysis and unlimited vocabulary via premium upgrade