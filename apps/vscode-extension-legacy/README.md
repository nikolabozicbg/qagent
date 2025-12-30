# QAgenAI VS Code Extension

AI-powered test generation and self-healing for your code.

## Features

- 🔍 **Coverage Gap Detection**: Real-time analysis shows untested code
- ⚡ **Instant Test Generation**: Right-click → Generate Tests → Done in 30 seconds
- 🔄 **Self-Healing**: Tests auto-update when you refactor code
- 🌍 **15+ Frameworks**: Jest, Vitest, Pytest, Mocha, and more

## Installation

1. Install the extension
2. Set your Claude API key in settings:
   - Open Settings (Cmd+,)
   - Search for "QAgenAI"
   - Enter your API key

## Usage

1. Right-click on any file in the Explorer
2. Select "Generate Tests with QAgenAI"
3. Tests will be generated and opened automatically

OR

1. Open a file in the editor
2. Right-click in the editor
3. Select "Generate Tests with QAgenAI"

## Requirements

- VS Code 1.85.0 or higher
- Claude API key
- QAgenAI backend running (optional, uses cloud by default)

## Extension Settings

- `qagenai.apiKey`: Your Claude API key
- `qagenai.apiUrl`: Backend API URL (default: http://localhost:3001)

## Release Notes

### 0.0.1

Initial MVP release:
- Basic test generation
- Support for TypeScript, JavaScript, Python
- Right-click context menu

---

**Enjoy!** 🚀
