/**
 * Semantic Field Classifier
 * 
 * Classifies form fields into semantic types using multi-signal weighted voting.
 * 
 * PRINCIPLES:
 * - Based on HTML/ARIA standards (type=password is ALWAYS password)
 * - Multiple signals combined via weighted voting
 * - No hardcoded string matching - uses pattern-based recognition
 * - Extensible via configuration
 */

import {
  RawFieldData,
  ClassifiedField,
  Signal,
  ClassificationResult,
  SelectorCandidate,
} from './types';

// ============================================================================
// SIGNAL EXTRACTORS
// ============================================================================

interface SignalExtractor {
  name: string;
  weight: number;
  extract(field: RawFieldData): Signal | null;
}

/**
 * Signal 1: HTML input type attribute
 * This is the most reliable signal (HTML standard)
 */
const htmlTypeExtractor: SignalExtractor = {
  name: 'html-type',
  weight: 1.0,
  extract(field: RawFieldData): Signal | null {
    if (!field.type) return null;
    
    const typeMap: Record<string, string> = {
      'password': 'PASSWORD',
      'email': 'EMAIL',
      'tel': 'PHONE',
      'number': 'NUMBER',
      'date': 'DATE',
      'datetime-local': 'DATETIME',
      'time': 'TIME',
      'url': 'URL',
      'search': 'SEARCH',
      'file': 'FILE',
      'checkbox': 'CHECKBOX',
      'radio': 'RADIO',
    };
    
    const semanticType = typeMap[field.type.toLowerCase()];
    if (semanticType) {
      return {
        source: 'html-type',
        type: semanticType,
        confidence: 1.0,
        weight: 1.0,
        evidence: `type="${field.type}"`,
      };
    }
    return null;
  },
};

/**
 * Signal 2: HTML autocomplete attribute
 * Very reliable (browser standard for autofill)
 */
const autocompleteExtractor: SignalExtractor = {
  name: 'autocomplete',
  weight: 0.95,
  extract(field: RawFieldData): Signal | null {
    if (!field.autocomplete) return null;
    
    const autocompleteMap: Record<string, string> = {
      'username': 'USERNAME',
      'email': 'EMAIL',
      'current-password': 'PASSWORD',
      'new-password': 'PASSWORD',
      'given-name': 'FIRST_NAME',
      'family-name': 'LAST_NAME',
      'name': 'FULL_NAME',
      'tel': 'PHONE',
      'tel-national': 'PHONE',
      'street-address': 'ADDRESS',
      'address-line1': 'ADDRESS',
      'address-line2': 'ADDRESS_2',
      'address-level1': 'STATE',
      'address-level2': 'CITY',
      'postal-code': 'ZIP_CODE',
      'country': 'COUNTRY',
      'cc-number': 'CARD_NUMBER',
      'cc-exp': 'CARD_EXPIRY',
      'cc-csc': 'CARD_CVV',
      'cc-name': 'CARD_NAME',
      'organization': 'COMPANY',
      'organization-title': 'JOB_TITLE',
      'bday': 'BIRTH_DATE',
    };
    
    const semanticType = autocompleteMap[field.autocomplete.toLowerCase()];
    if (semanticType) {
      return {
        source: 'autocomplete',
        type: semanticType,
        confidence: 0.95,
        weight: 0.95,
        evidence: `autocomplete="${field.autocomplete}"`,
      };
    }
    return null;
  },
};

/**
 * Signal 3: Name/ID pattern matching
 * Uses pattern groups to recognize field semantics
 */
const namePatternExtractor: SignalExtractor = {
  name: 'name-pattern',
  weight: 0.85,
  extract(field: RawFieldData): Signal | null {
    const text = (field.name || field.id || '').toLowerCase();
    if (!text) return null;
    
    // Pattern groups - each group represents a semantic type
    // Patterns are designed to work across languages and naming conventions
    const patternGroups: { type: string; patterns: RegExp[]; confidence: number }[] = [
      {
        type: 'PASSWORD',
        patterns: [/passw/i, /pwd/i, /secret/i, /lozink/i, /senha/i, /密码/i, /пароль/i],
        confidence: 0.9,
      },
      {
        type: 'CONFIRM_PASSWORD',
        patterns: [/confirm.?pass/i, /pass.?confirm/i, /repeat.?pass/i, /re.?pass/i, /verify.?pass/i],
        confidence: 0.9,
      },
      {
        type: 'EMAIL',
        patterns: [/e.?mail/i, /correo/i, /邮箱/i, /почта/i],
        confidence: 0.85,
      },
      {
        type: 'USERNAME',
        patterns: [/user.?name/i, /login/i, /usuario/i, /用户名/i, /логин/i],
        confidence: 0.85,
      },
      {
        type: 'FIRST_NAME',
        patterns: [/first.?name/i, /given.?name/i, /fname/i, /vorname/i, /nombre/i, /prénom/i, /имя/i],
        confidence: 0.85,
      },
      {
        type: 'LAST_NAME',
        patterns: [/last.?name/i, /family.?name/i, /surname/i, /lname/i, /nachname/i, /apellido/i, /nom/i, /фамилия/i],
        confidence: 0.85,
      },
      {
        type: 'FULL_NAME',
        patterns: [/full.?name/i, /^name$/i, /your.?name/i],
        confidence: 0.8,
      },
      {
        type: 'PHONE',
        patterns: [/phone/i, /mobile/i, /tel/i, /telefon/i, /电话/i],
        confidence: 0.85,
      },
      {
        type: 'ADDRESS',
        patterns: [/address/i, /street/i, /addr/i, /地址/i, /адрес/i],
        confidence: 0.8,
      },
      {
        type: 'CITY',
        patterns: [/city/i, /ciudad/i, /ville/i, /stadt/i, /город/i],
        confidence: 0.8,
      },
      {
        type: 'STATE',
        patterns: [/state/i, /province/i, /region/i, /estado/i],
        confidence: 0.8,
      },
      {
        type: 'ZIP_CODE',
        patterns: [/zip/i, /postal/i, /postcode/i, /plz/i, /邮编/i],
        confidence: 0.8,
      },
      {
        type: 'COUNTRY',
        patterns: [/country/i, /nation/i, /país/i, /pays/i, /国家/i],
        confidence: 0.8,
      },
      {
        type: 'COMPANY',
        patterns: [/company/i, /organization/i, /org/i, /business/i, /firma/i, /empresa/i],
        confidence: 0.8,
      },
      {
        type: 'WEBSITE',
        patterns: [/website/i, /web.?site/i, /url/i, /homepage/i],
        confidence: 0.8,
      },
      {
        type: 'AMOUNT',
        patterns: [/amount/i, /price/i, /cost/i, /total/i, /monto/i, /金额/i],
        confidence: 0.8,
      },
      {
        type: 'DESCRIPTION',
        patterns: [/description/i, /desc/i, /about/i, /bio/i, /summary/i],
        confidence: 0.75,
      },
      {
        type: 'TITLE',
        patterns: [/^title$/i, /subject/i, /headline/i, /标题/i],
        confidence: 0.75,
      },
      {
        type: 'MESSAGE',
        patterns: [/message/i, /content/i, /body/i, /text/i, /comment/i, /note/i],
        confidence: 0.7,
      },
      {
        type: 'SEARCH',
        patterns: [/search/i, /query/i, /q$/i, /buscar/i, /搜索/i],
        confidence: 0.8,
      },
      {
        type: 'DATE',
        patterns: [/date/i, /fecha/i, /datum/i, /日期/i],
        confidence: 0.75,
      },
      {
        type: 'ROUTING_NUMBER',
        patterns: [/routing/i, /aba/i, /sort.?code/i],
        confidence: 0.85,
      },
      {
        type: 'ACCOUNT_NUMBER',
        patterns: [/account.?num/i, /acct/i, /iban/i],
        confidence: 0.85,
      },
      {
        type: 'BANK_NAME',
        patterns: [/bank.?name/i, /bank$/i, /financial.?inst/i],
        confidence: 0.8,
      },
    ];
    
    for (const group of patternGroups) {
      for (const pattern of group.patterns) {
        if (pattern.test(text)) {
          return {
            source: 'name-pattern',
            type: group.type,
            confidence: group.confidence,
            weight: 0.85,
            evidence: `name/id matches ${pattern}`,
          };
        }
      }
    }
    return null;
  },
};

/**
 * Signal 4: Label text analysis
 */
const labelExtractor: SignalExtractor = {
  name: 'label',
  weight: 0.75,
  extract(field: RawFieldData): Signal | null {
    const text = (field.labelText || '').toLowerCase();
    if (!text || text.length < 2) return null;
    
    // Reuse the same pattern groups
    const patternGroups: { type: string; patterns: RegExp[]; confidence: number }[] = [
      { type: 'PASSWORD', patterns: [/password/i, /lozinka/i], confidence: 0.8 },
      { type: 'EMAIL', patterns: [/e.?mail/i, /email.?address/i], confidence: 0.8 },
      { type: 'USERNAME', patterns: [/user.?name/i, /login/i], confidence: 0.75 },
      { type: 'FIRST_NAME', patterns: [/first.?name/i, /given.?name/i], confidence: 0.8 },
      { type: 'LAST_NAME', patterns: [/last.?name/i, /family.?name/i, /surname/i], confidence: 0.8 },
      { type: 'PHONE', patterns: [/phone/i, /mobile/i, /telephone/i], confidence: 0.75 },
    ];
    
    for (const group of patternGroups) {
      for (const pattern of group.patterns) {
        if (pattern.test(text)) {
          return {
            source: 'label',
            type: group.type,
            confidence: group.confidence,
            weight: 0.75,
            evidence: `label="${field.labelText}"`,
          };
        }
      }
    }
    return null;
  },
};

/**
 * Signal 5: Placeholder analysis
 */
const placeholderExtractor: SignalExtractor = {
  name: 'placeholder',
  weight: 0.65,
  extract(field: RawFieldData): Signal | null {
    const text = (field.placeholder || '').toLowerCase();
    if (!text || text.length < 3) return null;
    
    // Simpler patterns for placeholder (often contains "Enter your...")
    const patternGroups: { type: string; patterns: RegExp[]; confidence: number }[] = [
      { type: 'EMAIL', patterns: [/email/i, /e-mail/i], confidence: 0.7 },
      { type: 'PASSWORD', patterns: [/password/i, /pass/i], confidence: 0.7 },
      { type: 'USERNAME', patterns: [/username/i, /user/i], confidence: 0.65 },
      { type: 'SEARCH', patterns: [/search/i, /find/i], confidence: 0.7 },
      { type: 'PHONE', patterns: [/phone/i, /mobile/i], confidence: 0.65 },
    ];
    
    for (const group of patternGroups) {
      for (const pattern of group.patterns) {
        if (pattern.test(text)) {
          return {
            source: 'placeholder',
            type: group.type,
            confidence: group.confidence,
            weight: 0.65,
            evidence: `placeholder="${field.placeholder}"`,
          };
        }
      }
    }
    return null;
  },
};

/**
 * Signal 6: ARIA label analysis
 */
const ariaExtractor: SignalExtractor = {
  name: 'aria-label',
  weight: 0.7,
  extract(field: RawFieldData): Signal | null {
    const text = (field.ariaLabel || '').toLowerCase();
    if (!text || text.length < 2) return null;
    
    // Use same pattern approach
    const patternGroups: { type: string; patterns: RegExp[]; confidence: number }[] = [
      { type: 'PASSWORD', patterns: [/password/i], confidence: 0.8 },
      { type: 'EMAIL', patterns: [/email/i], confidence: 0.8 },
      { type: 'USERNAME', patterns: [/username/i, /user.?name/i], confidence: 0.75 },
    ];
    
    for (const group of patternGroups) {
      for (const pattern of group.patterns) {
        if (pattern.test(text)) {
          return {
            source: 'aria-label',
            type: group.type,
            confidence: group.confidence,
            weight: 0.7,
            evidence: `aria-label="${field.ariaLabel}"`,
          };
        }
      }
    }
    return null;
  },
};

/**
 * Signal 7: Sequential context (previous field analysis)
 */
function createContextExtractor(previousField: ClassifiedField | null): SignalExtractor {
  return {
    name: 'context',
    weight: 0.6,
    extract(field: RawFieldData): Signal | null {
      if (!previousField) return null;
      
      const prevType = previousField.semantic.type;
      const currentType = field.type?.toLowerCase();
      
      // If previous field is PASSWORD and current is also password type → likely CONFIRM_PASSWORD
      if (prevType === 'PASSWORD' && currentType === 'password') {
        return {
          source: 'context',
          type: 'CONFIRM_PASSWORD',
          confidence: 0.75,
          weight: 0.6,
          evidence: `follows PASSWORD field`,
        };
      }
      
      // If previous is FIRST_NAME → current might be LAST_NAME
      if (prevType === 'FIRST_NAME' && currentType === 'text') {
        return {
          source: 'context',
          type: 'LAST_NAME',
          confidence: 0.5, // Lower confidence - just a hint
          weight: 0.4,
          evidence: `follows FIRST_NAME field`,
        };
      }
      
      return null;
    },
  };
}

// ============================================================================
// SELECTOR GENERATION
// ============================================================================

/**
 * Generate ranked selector candidates for a field
 */
function generateSelectors(field: RawFieldData): SelectorCandidate[] {
  const candidates: SelectorCandidate[] = [];
  
  // Strategy 1: data-testid (most stable)
  if (field.dataTestId) {
    candidates.push({
      strategy: 'data-testid',
      selector: `[data-testid="${field.dataTestId}"]`,
      score: 100,
      isStable: true,
      validated: false,
      playwrightStyle: false,
    });
  }
  
  // Strategy 2: data-test
  if (field.dataTest) {
    candidates.push({
      strategy: 'data-test',
      selector: `[data-test="${field.dataTest}"]`,
      score: 98,
      isStable: true,
      validated: false,
      playwrightStyle: false,
    });
  }
  
  // Strategy 3: data-cy (Cypress convention)
  if (field.dataCy) {
    candidates.push({
      strategy: 'data-cy',
      selector: `[data-cy="${field.dataCy}"]`,
      score: 97,
      isStable: true,
      validated: false,
      playwrightStyle: false,
    });
  }
  
  // Strategy 4: name attribute
  if (field.name) {
    candidates.push({
      strategy: 'name',
      selector: `[name="${field.name}"]`,
      score: 90,
      isStable: true,
      validated: false,
      playwrightStyle: false,
    });
  }
  
  // Strategy 5: id attribute
  if (field.id) {
    candidates.push({
      strategy: 'id',
      selector: `#${field.id}`,
      score: 85,
      isStable: false, // IDs can change
      validated: false,
      playwrightStyle: false,
    });
  }
  
  // Strategy 6: Playwright getByRole
  if (field.role || field.type) {
    const role = field.role || (field.type === 'password' ? 'textbox' : 'textbox');
    const name = field.ariaLabel || field.labelText;
    if (name) {
      candidates.push({
        strategy: 'role',
        selector: `getByRole('${role}', { name: /${escapeRegex(name)}/i })`,
        score: 80,
        isStable: true,
        validated: false,
        playwrightStyle: true,
      });
    }
  }
  
  // Strategy 7: Playwright getByLabel
  if (field.labelText) {
    candidates.push({
      strategy: 'label',
      selector: `getByLabel(/${escapeRegex(field.labelText)}/i)`,
      score: 75,
      isStable: true,
      validated: false,
      playwrightStyle: true,
    });
  }
  
  // Strategy 8: Playwright getByPlaceholder
  if (field.placeholder) {
    candidates.push({
      strategy: 'placeholder',
      selector: `getByPlaceholder(/${escapeRegex(field.placeholder)}/i)`,
      score: 65,
      isStable: false, // Placeholders change with i18n
      validated: false,
      playwrightStyle: true,
    });
  }
  
  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// TEST VALUE GENERATION
// ============================================================================

/**
 * Generate test values based on semantic type
 */
function generateTestValues(semanticType: string): { valid: string; invalid: string[]; edge: string[] } {
  const testValueMap: Record<string, { valid: string; invalid: string[]; edge: string[] }> = {
    PASSWORD: {
      valid: 'SecurePass123!',
      invalid: ['', '123', 'a'],
      edge: ['A'.repeat(100), '!@#$%^&*()'],
    },
    EMAIL: {
      valid: 'test@example.com',
      invalid: ['', 'notanemail', '@invalid', 'missing@domain'],
      edge: ['very.long.email.address.that.is.valid@subdomain.example.com', 'test+tag@example.com'],
    },
    USERNAME: {
      valid: 'testuser123',
      invalid: ['', ' ', 'ab'],
      edge: ['a'.repeat(50), 'user_with_underscore'],
    },
    FIRST_NAME: {
      valid: 'John',
      invalid: ['', '123'],
      edge: ['Mary-Jane', "O'Connor", 'José'],
    },
    LAST_NAME: {
      valid: 'Doe',
      invalid: ['', '123'],
      edge: ['Van der Berg', "O'Brien", 'Müller'],
    },
    PHONE: {
      valid: '+1-555-123-4567',
      invalid: ['', 'abc', '123'],
      edge: ['+44 20 7946 0958', '555.123.4567'],
    },
    ZIP_CODE: {
      valid: '94102',
      invalid: ['', 'abcde'],
      edge: ['12345-6789', 'SW1A 1AA'],
    },
    AMOUNT: {
      valid: '100.00',
      invalid: ['', 'abc', '-100'],
      edge: ['0.01', '999999.99'],
    },
    ROUTING_NUMBER: {
      valid: '123456789',
      invalid: ['', '123', 'abcdefghi'],
      edge: ['000000000', '999999999'],
    },
    ACCOUNT_NUMBER: {
      valid: '9876543210',
      invalid: ['', '123', 'abc'],
      edge: ['0'.repeat(17), '1'.repeat(17)],
    },
    BANK_NAME: {
      valid: 'Chase Bank',
      invalid: ['', 'A'],
      edge: ['Bank of America Corporation', 'Wells Fargo & Company'],
    },
    SEARCH: {
      valid: 'test query',
      invalid: [],
      edge: ['', 'a'.repeat(100)],
    },
    DESCRIPTION: {
      valid: 'This is a test description.',
      invalid: [],
      edge: ['', 'a'.repeat(1000)],
    },
    UNKNOWN: {
      valid: 'test value',
      invalid: [''],
      edge: ['', 'a'.repeat(100)],
    },
  };
  
  return testValueMap[semanticType] || testValueMap['UNKNOWN'];
}

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

/**
 * Classify a single field
 */
export function classifyField(
  field: RawFieldData,
  previousField: ClassifiedField | null = null
): ClassifiedField {
  // Collect all signals
  const extractors: SignalExtractor[] = [
    htmlTypeExtractor,
    autocompleteExtractor,
    namePatternExtractor,
    labelExtractor,
    placeholderExtractor,
    ariaExtractor,
    createContextExtractor(previousField),
  ];
  
  const signals: Signal[] = [];
  for (const extractor of extractors) {
    const signal = extractor.extract(field);
    if (signal) {
      signals.push(signal);
    }
  }
  
  // Weighted voting
  let classification: ClassificationResult;
  
  if (signals.length === 0) {
    classification = {
      type: 'UNKNOWN',
      confidence: 0,
      signals: [],
      reasoning: 'No signals matched',
    };
  } else {
    const votes: Record<string, number> = {};
    for (const signal of signals) {
      const score = signal.confidence * signal.weight;
      votes[signal.type] = (votes[signal.type] || 0) + score;
    }
    
    // Find winner
    const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const winner = sortedVotes[0];
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    
    classification = {
      type: winner[0],
      confidence: Math.min(1, winner[1] / totalWeight),
      signals,
      reasoning: signals.map(s => `${s.source}: ${s.type} (${s.evidence})`).join('; '),
    };
  }
  
  // Generate selectors
  const selectors = generateSelectors(field);
  
  // Generate test values
  const testValues = generateTestValues(classification.type);
  
  return {
    raw: field,
    semantic: {
      type: classification.type,
      confidence: classification.confidence,
      signals: classification.signals,
    },
    selectors,
    testValues,
  };
}

/**
 * Classify all fields in a form
 */
export function classifyFields(fields: RawFieldData[]): ClassifiedField[] {
  const classified: ClassifiedField[] = [];
  
  for (let i = 0; i < fields.length; i++) {
    const previousField = i > 0 ? classified[i - 1] : null;
    classified.push(classifyField(fields[i], previousField));
  }
  
  return classified;
}
