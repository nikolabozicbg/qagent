# Fix: E2E Test Generation Using Playwright

## Problem
Agent je generisao pogrešan tip testa za E2E foldere:
- U `tests/e2e/` folderu je kreirao React Testing Library testove
- Koristio je `render()` i `screen` iz `@testing-library/react`
- Importovao komponente direktno (`import PrivacyPage from './page'`)
- Rezultat: testovi nisu radili jer Playwright ne može da pokrene komponentne testove

## Root Cause
U `agent.service.ts` metodi `buildUserPrompt()`:
- Nije postojala detekcija da li je test u E2E folderu
- Nije bilo specifičnih instrukcija za Playwright E2E testove
- Agent nije razlikovao komponentne testove od E2E testova

## Solution

### 1. Detekcija E2E konteksta (linija 371-377)
```typescript
// Detect test type based on directory structure
const isE2ETest = sourceDir.includes('/e2e') || sourceDir.includes('\\e2e') || 
                  sourceDir.includes('/tests/e2e') || sourceDir.includes('\\tests\\\\e2e') ||
                  sourceDir.includes('/integration') || sourceDir.includes('\\integration');

// Check if Playwright is available for E2E
const hasPlaywright = context?.frameworks?.e2e?.name === 'playwright';
```

### 2. Različiti promptovi za E2E vs Unit testove (linija 383-427)
Kada je detektovan E2E folder **i** Playwright framework, agent dobija:

#### E2E Mode (Playwright):
- ✅ Koristi `import { test, expect } from '@playwright/test'`
- ✅ Koristi `page.goto()` za navigaciju
- ✅ Koristi `page.getByRole()`, `page.getByText()`, `page.locator()`
- ✅ Testira RUNNING aplikaciju u browseru
- ❌ **NIKADA** ne importuje React komponente
- ❌ **NIKADA** ne koristi `@testing-library/react`
- ❌ **NIKADA** ne koristi `render()`

#### Unit/Component Mode (Jest/Vitest):
- ✅ Importuje komponente/servise direktno
- ✅ Koristi Test/TestingModule za NestJS
- ✅ Koristi relativne import putanje

### 3. Pojačane instrukcije za Playwright (linija 296-305)
Dodato u system prompt kada je Playwright detektovan:
```
PLAYWRIGHT E2E RULES:
✅ import { test, expect } from '@playwright/test';
✅ Use page.goto(url) to navigate to pages
✅ Use page.getByRole(), page.getByText(), page.locator()
✅ Test the RUNNING application in browser, not component imports
❌ NEVER import React components directly in E2E tests
❌ NEVER use @testing-library/react render() in E2E tests
❌ E2E tests interact via browser, not component APIs
```

## Expected Behavior

### Before Fix (❌ Pogrešno)
```typescript
// apps/frontend/tests/e2e/page.spec.tsx
import { render } from '@testing-library/react'; // ❌ WRONG
import PrivacyPage from './page'; // ❌ WRONG

describe('PrivacyPage', () => {
  test('renders Privacy Policy heading', () => {
    render(<PrivacyPage />); // ❌ WRONG - nije E2E!
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });
});
```

### After Fix (✅ Ispravno)
```typescript
// apps/frontend/tests/e2e/page.spec.tsx
import { test, expect } from '@playwright/test'; // ✅ CORRECT

test.describe('Privacy Page E2E', () => {
  test('displays privacy policy heading', async ({ page }) => {
    await page.goto('/privacy'); // ✅ CORRECT - pravi E2E
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });
  
  test('displays last updated date', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/Last updated:/i)).toBeVisible();
  });
});
```

## Files Changed
- `/apps/backend/src/modules/generation/agent.service.ts`
  - Linija 289-305: Playwright-specific framework info
  - Linija 344-427: E2E detection + conditional prompt generation

## Testing
Da testiraš fix:

1. **U VS Code extension**, generiši test za bilo koji fajl u `tests/e2e/` folderu
2. Agent bi sada trebao da:
   - Detektuje da je to E2E folder
   - Generiše Playwright test sa `page.goto()`
   - **NE** koristi React Testing Library

3. Pokreni test:
```bash
cd apps/frontend
npx playwright test tests/e2e/page.spec.tsx
```

Test bi trebao da prođe (uz podmirene uslove: dev server ili webServer u playwright.config.ts).

## Future Improvements
- [ ] Automatska detekcija URL-a iz Next.js/React Router konfiguracije
- [ ] Podešavanje `baseURL` u Playwright config-u
- [ ] Auto-start dev servera pre E2E testova (webServer config)
- [ ] Template-i za česte E2E scenarije (login, form submission, navigation)
