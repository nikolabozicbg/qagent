# QAgent Backend (NestJS)

AI-powered test generation backend with PDF/DOCX parsing and OpenAI integration.

## Features

- 📄 **File Upload & Extraction** - PDF, DOCX, TXT, MD support
- 🤖 **AI Test Generation** - OpenAI GPT-4 integration
- 🔐 **Authentication** - Mock auth (ready for real implementation)
- 👤 **User Management** - User profiles and usage tracking
- 📊 **System Health** - Health checks and monitoring

## Tech Stack

- **NestJS** - Backend framework
- **OpenAI API** - AI test generation
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX text extraction
- **TypeScript** - Type safety

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env
   ```

3. **Start development server:**
   ```bash
   npm run start:dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm run start:prod
   ```

## API Endpoints

### System
- `GET /system/health` - Health check

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Users
- `GET /user/me` - Get current user
- `GET /user/usage` - Get usage stats

### Upload
- `POST /upload/extract` - Upload and extract text from file
  - Supports: PDF, DOCX, TXT, MD
  - Max size: 10MB

### Generation
- `POST /generate/test-suite` - Generate complete test suite
  - Body: `{ input: string, url?: string, outputTypes?: string[] }`
  
- `POST /generate/refine` - Refine existing output
  - Body: `{ existingOutput: any, refinementPrompt: string }`

### Feedback
- `POST /system/feedback` - Send feedback

## Environment Variables

```env
OPENAI_API_KEY=sk-your-api-key-here
PORT=3001
NODE_ENV=development
```

## Mock Mode

If `OPENAI_API_KEY` is not set, the backend runs in **mock mode** with predefined responses. This is useful for:
- Development without API costs
- Testing frontend integration
- Demos

## Development

```bash
# Watch mode
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Lint
npm run lint

# Tests
npm run test
```

## Project Structure

```
src/
├── config/           # Configuration files
├── modules/
│   ├── auth/        # Authentication
│   ├── users/       # User management
│   ├── upload/      # File upload & extraction
│   ├── generation/  # AI test generation
│   └── system/      # System utilities
├── app.module.ts    # Root module
└── main.ts          # Entry point
```

## Generated Output Structure

```json
{
  "scenarios": "High-level test scenarios",
  "test_cases": "Detailed step-by-step test cases",
  "gherkin": "Gherkin/BDD scenarios",
  "automation": "Playwright/Selenium code",
  "selectors": "UI element selectors",
  "pom": "Page Object Model",
  "stepdefs": "BDD step definitions",
  "api": "API test cases",
  "testData": "Test data dictionary",
  "negatives": "Negative/edge cases",
  "security": "Security recommendations",
  "risk": "Coverage analysis",
  "compatibility": "Browser compatibility"
}
```

## Next Steps

- [ ] Add real authentication (JWT, Passport)
- [ ] Implement database (PostgreSQL/MongoDB)
- [ ] Add rate limiting
- [ ] Implement real subscription management (Stripe)
- [ ] Add result caching
- [ ] Deploy to production (Railway, Heroku, AWS)
