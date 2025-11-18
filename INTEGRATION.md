# QAgent Frontend-Backend Integration Guide

Complete guide for running QAgent with full frontend-backend integration.

## Architecture

```
Frontend (Next.js) → Backend (NestJS) → OpenAI API
     :3000                :3001          gpt-4-turbo
```

## Setup

### 1. Backend Setup

```bash
cd apps/backend

# Install dependencies (if not already done)
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start backend
npm run start:dev
```

Backend will run at **http://localhost:3001**

### 2. Frontend Setup

```bash
cd apps/frontend

# Install dependencies (if not already done)
npm install

# Environment is already configured in .env.local
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Start frontend
npm run dev
```

Frontend will run at **http://localhost:3000**

## Usage Flow

1. **Upload Page** (`/upload`)
   - User uploads PDF/DOCX/TXT/MD file
   - Or enters text description
   - Frontend → `POST /upload/extract` (if file)
   - Frontend → `POST /generate/test-suite` (with text)

2. **Result Page** (`/result`)
   - Displays generated test suite
   - Data stored in sessionStorage
   - "Refine" button → `POST /generate/refine`

3. **Demo Page** (`/demo`)
   - Uses mock data (no backend calls)
   - Good for testing UI without API costs

## API Endpoints Used

### Frontend → Backend

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/upload/extract` | Extract text from file |
| POST | `/generate/test-suite` | Generate test suite |
| POST | `/generate/refine` | Refine existing suite |
| GET | `/system/health` | Health check |

### Request/Response Examples

**Upload & Extract:**
```bash
POST /upload/extract
Content-Type: multipart/form-data

file: [PDF/DOCX/TXT/MD file]

Response:
{
  "text": "extracted text...",
  "filename": "spec.pdf",
  "size": 12345,
  "extractedAt": "2025-11-18T07:00:00.000Z"
}
```

**Generate Suite:**
```bash
POST /generate/test-suite
Content-Type: application/json

{
  "input": "User login with email and password...",
  "url": "https://example.com",
  "outputTypes": []
}

Response:
{
  "scenarios": "...",
  "test_cases": "...",
  "gherkin": "...",
  "automation": "...",
  "selectors": {...},
  "pom": "...",
  "stepdefs": "...",
  "api": "...",
  "testData": {...},
  "negatives": [...],
  "security": [...],
  "risk": [...],
  "compatibility": [...]
}
```

**Refine Suite:**
```bash
POST /generate/refine
Content-Type: application/json

{
  "existingOutput": { /* current suite */ },
  "refinementPrompt": "Add more edge cases for authentication"
}

Response:
{ /* refined suite with same structure */ }
```

## Mock Mode

If `OPENAI_API_KEY` is not set in backend `.env`, the backend runs in **mock mode**:
- Returns predefined test data
- No API costs
- Good for development/testing
- Same response structure as real mode

## File Structure

### Frontend
```
apps/frontend/
├── src/
│   ├── lib/
│   │   └── api.ts              # API wrapper (NEW)
│   ├── components/
│   │   ├── UploadBox.tsx       # Updated to use API
│   │   └── ui/
│   │       └── skeleton.tsx    # Loading component (NEW)
│   └── app/
│       ├── upload/page.tsx     # Upload page
│       ├── result/page.tsx     # Updated to use API
│       └── demo/page.tsx       # Mock data demo
└── .env.local                  # Backend URL config
```

### Backend
```
apps/backend/
├── src/
│   ├── config/                 # Config files
│   ├── modules/
│   │   ├── upload/            # File extraction
│   │   ├── generation/        # AI generation
│   │   ├── auth/              # Authentication
│   │   ├── users/             # User management
│   │   └── system/            # Health & utilities
│   ├── app.module.ts          # Root module
│   └── main.ts                # Entry point
├── .env                       # Environment config
└── .env.example               # Template
```

## Testing the Integration

### 1. Health Check
```bash
curl http://localhost:3001/system/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Test File Upload
```bash
curl -X POST http://localhost:3001/upload/extract \
  -F "file=@/path/to/test.pdf"
```

### 3. Test Generation
```bash
curl -X POST http://localhost:3001/generate/test-suite \
  -H "Content-Type: application/json" \
  -d '{"input":"User login flow with email and password"}'
```

### 4. Frontend Test
1. Go to http://localhost:3000/upload
2. Upload a test file or enter text
3. Click "Generate Test Suite"
4. View results at /result
5. Try "Refine" feature

## Troubleshooting

### CORS Errors
- Backend has CORS enabled by default
- If issues persist, check `main.ts` CORS config

### Connection Refused
- Ensure backend is running on port 3001
- Check `.env.local` has correct `NEXT_PUBLIC_BACKEND_URL`

### OpenAI API Errors
- Verify `OPENAI_API_KEY` in `apps/backend/.env`
- Check OpenAI account has credits
- Backend will fallback to mock mode if key is invalid

### File Upload Errors
- Max file size: 10MB
- Supported formats: PDF, DOCX, TXT, MD
- Check backend logs for detailed errors

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Backend (.env)
```env
OPENAI_API_KEY=sk-...
PORT=3001
NODE_ENV=development
```

## Production Deployment

### Backend
- Deploy to Railway, Heroku, or AWS
- Set `OPENAI_API_KEY` environment variable
- Update `PORT` if needed

### Frontend
- Deploy to Vercel, Netlify, or AWS
- Set `NEXT_PUBLIC_BACKEND_URL` to production backend URL
- Build: `npm run build`
- Start: `npm run start`

## Next Steps

- [ ] Add real authentication (JWT)
- [ ] Implement database (PostgreSQL)
- [ ] Add result caching
- [ ] Implement subscription management (Stripe)
- [ ] Add rate limiting
- [ ] Deploy to production

## Support

For issues or questions:
- Check backend logs: `apps/backend/dist/main.js`
- Check frontend console: Browser DevTools
- Review API responses in Network tab
