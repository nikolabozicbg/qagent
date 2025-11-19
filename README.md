# QAGenAI

Turborepo monorepo with Next.js frontend and NestJS backend.

## Structure

```
qagenai/
├── apps/
│   ├── frontend/     (Next.js 14)
│   └── backend/      (NestJS)
├── packages/
│   ├── ui/           (shared components)
│   └── config/       (shared configs)
├── turbo.json
├── package.json
└── README.md
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development servers:
```bash
npm run dev
```

3. Build all apps:
```bash
npm run build
```

## Apps

- **frontend**: Next.js 14 application (http://localhost:3000)
- **backend**: NestJS API (http://localhost:3001)

## Packages

- **ui**: Shared React components
- **config**: Shared TypeScript and ESLint configurations
