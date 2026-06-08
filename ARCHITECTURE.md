# LocalMind Lab Architecture

This document describes the architecture and structure of the LocalMind Lab application.

## Overview

LocalMind Lab is a Node.js application for working with local LLM models through the llama.cpp API. The application consists of a backend Express.js server and a vanilla JavaScript frontend.

## Project Structure

```
localmind-lab/
├── public/                      # Frontend assets
│   ├── app.js                  # Main application entry point
│   ├── init.js                 # Application initialization
│   ├── orchestrator.js         # Module coordination
│   ├── handlers.js             # Event handlers
│   ├── api.js                  # API client functions
│   ├── state.js                # State management
│   ├── ui.js                   # UI rendering functions
│   ├── utils.js                # Utility functions
│   ├── markdown.js             # Markdown rendering
│   ├── presets.js              # Preset configurations
│   ├── modules/                # Business logic modules
│   │   ├── app-state.js        # Application state management
│   │   ├── mode-manager.js     # Mode switching logic
│   │   ├── skill-manager.js    # Skill and capabilities management
│   │   ├── request-runner.js   # API request execution
│   │   └── loading-manager.js  # Loading state management
│   ├── index.html              # Main HTML file
│   └── styles.css              # Application styles
├── src/                        # Backend source
│   ├── server.js               # Express server setup
│   ├── controllers/            # Route handlers
│   │   ├── agent.js            # Banking agent controller
│   │   ├── chat.js             # Chat completion controller
│   │   ├── rag.js              # RAG controller
│   │   ├── system.js           # System endpoints controller
│   │   └── upload.js           # File upload controller
│   ├── services/               # Business logic services
│   │   ├── banking.js           # Banking service
│   │   └── rag-service.js      # RAG service
│   ├── utils/                  # Utility functions
│   │   └── llm-retry.js        # LLM retry logic
│   ├── client.js               # Llama client configuration
│   ├── llama-client.js         # Llama client implementation
│   ├── chat-request.js         # Chat request validation
│   ├── structured-output.js    # Structured output handling
│   └── banking-agent.js        # Banking agent logic
├── test/                       # Test files
├── docs/                       # Documentation
├── package.json                # Dependencies
└── README.md                   # Project documentation
```

## Frontend Architecture

### Module Structure

The frontend is organized into several modules with clear responsibilities:

#### Core Files

- **app.js**: Main entry point that orchestrates all modules and initializes the application
- **init.js**: Handles startup logic and initial state setup (loading models, setting initial UI state)
- **orchestrator.js**: Coordinates between different modules and manages app-level logic
- **handlers.js**: Centralized event listener setup for UI interactions

#### Business Logic Modules (public/modules/)

- **app-state.js**: Centralized state management for the application
  - Manages active capability state
  - Manages current capabilities data
  - Provides getters and setters for state access

- **mode-manager.js**: Handles mode switching and mode-related UI updates
  - Updates mode help text and button states
  - Manages upload button visibility based on mode
  - Sets appropriate preset messages for each mode
  - Applies response language to conversation

- **skill-manager.js**: Handles skill activation and capabilities management
  - Activates skills and updates application state
  - Renders capabilities list (tools/skills)
  - Loads capabilities from API

- **request-runner.js**: Handles API request execution for different modes
  - Runs model requests for specified temperatures
  - Handles both streaming and standard request modes
  - Manages request lifecycle and error handling

- **loading-manager.js**: Manages loading state for the application
  - Shows/hides loading spinner
  - Updates send button state during requests

#### Supporting Modules

- **api.js**: API client functions for server communication
- **state.js**: Centralized state for UI elements and user preferences
- **ui.js**: UI rendering functions and DOM manipulation
- **utils.js**: Utility functions used across the application
- **markdown.js**: Safe Markdown rendering
- **presets.js**: Preset configurations for different modes

### Data Flow

1. **Initialization**: `app.js` → `init.js` → Load models → Set initial state
2. **User Interaction**: `handlers.js` → Orchestrator → Specific modules
3. **API Requests**: `request-runner.js` → `api.js` → Backend
4. **State Updates**: Modules → `app-state.js` → UI updates via `ui.js`

### Event Handling

Event handlers are centralized in `handlers.js` and follow a consistent pattern:
- Setup functions for each feature area (prompt builder, capabilities, file upload, etc.)
- Callback functions passed from orchestrator for business logic
- Separation of UI event handling from business logic

## Backend Architecture

### Server Structure

- **server.js**: Express server setup with route configuration and middleware
- **controllers/**: Route handlers for different API endpoints
- **services/**: Business logic services (banking, RAG)
- **utils/**: Shared utility functions

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | Lists available models |
| GET | `/api/capabilities` | Returns available tools and skills |
| POST | `/api/chat` | Runs standard chat completion |
| POST | `/api/chat/stream` | Streams completion over SSE |
| POST | `/api/structured` | Produces schema-validated document analysis |
| POST | `/api/banking-agent` | Runs mock tool-calling agent |
| POST | `/api/rag` | Runs RAG search |
| POST | `/api/upload` | Uploads and indexes files |
| GET | `/api/uploads` | Lists uploaded files |
| DELETE | `/api/upload/:filename` | Deletes uploaded file |

### Key Components

- **LlamaClient**: OpenAI-compatible client for llama.cpp communication
- **ChatRequest**: Request validation and building
- **StructuredOutput**: JSON extraction and validation with Zod
- **BankingAgent**: Tool-calling agent loop implementation
- **RagService**: Document indexing and search using FlexSearch

## Design Patterns

### Frontend

- **Module Pattern**: Business logic separated into focused modules
- **Centralized State**: State management in dedicated modules
- **Event Delegation**: Centralized event handler setup
- **Separation of Concerns**: Clear distinction between UI, state, and business logic

### Backend

- **Controller Pattern**: Route handlers separated by feature
- **Service Pattern**: Business logic in service layer
- **Dependency Injection**: Services injected into controllers
- **Error Handling Middleware**: Centralized error handling

## Refactoring Improvements

The following refactoring has been completed to improve code quality:

### Phase 1: Code Deduplication
- Removed duplicate event handlers from `app.js`
- Created dedicated `handlers.js` for all event handling
- Created `init.js` for initialization logic
- Created `orchestrator.js` for module coordination

### Phase 2: Modularization
- Created `public/modules/` directory structure
- Extracted business logic into focused modules:
  - `app-state.js`: State management
  - `mode-manager.js`: Mode switching
  - `skill-manager.js`: Skill/capabilities management
  - `request-runner.js`: Request execution
  - `loading-manager.js`: Loading state
- Reduced `app.js` from 461 lines to ~80 lines
- Reduced `orchestrator.js` from 293 lines to ~42 lines

### Phase 3: Documentation
- Added JSDoc comments to all module functions
- Added type definitions for complex objects
- Created this ARCHITECTURE.md document

## Future Improvements

Potential areas for further enhancement:

1. **Type Safety**: Consider TypeScript migration for better type checking
2. **Testing**: Add comprehensive unit and integration tests
3. **Error Handling**: Implement more robust error handling and user feedback
4. **Logging**: Add structured logging for debugging
5. **Validation**: Add client-side validation for better UX
6. **Performance**: Optimize RAG indexing and search performance
7. **Security**: Add rate limiting and CORS configuration
8. **CI/CD**: Set up automated testing and deployment pipeline
