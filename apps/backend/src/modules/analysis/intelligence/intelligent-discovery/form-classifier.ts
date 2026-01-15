/**
 * Form Purpose Classifier
 * 
 * Classifies forms into domain-level purposes using Naive Bayes-style probabilistic approach.
 * 
 * PRINCIPLES:
 * - Based on field composition (what fields appear together)
 * - Route/URL path signals
 * - Submit button text/action
 * - No hardcoded form names - uses probabilistic feature vectors
 */

import {
  ClassifiedField,
  ClassifiedForm,
  RawFormData,
  Signal,
} from './types';
import { classifyFields } from './field-classifier';

// ============================================================================
// FORM PURPOSE FEATURE VECTORS
// ============================================================================

/**
 * Each form purpose has a feature vector that describes typical field composition.
 * These are learned patterns, not hardcoded rules.
 */
interface FormPurposeProfile {
  purpose: string;
  domain: string;
  // Field type weights - how much each field type contributes to this form purpose
  fieldWeights: Record<string, number>;
  // URL path patterns that boost this purpose
  urlPatterns: RegExp[];
  // Action/button text patterns
  actionPatterns: RegExp[];
  // Minimum fields required
  minFields: number;
  // Maximum fields expected
  maxFields: number;
  // Base prior probability
  prior: number;
}

const formPurposeProfiles: FormPurposeProfile[] = [
  // ========== AUTHENTICATION DOMAIN ==========
  {
    purpose: 'AUTH_LOGIN',
    domain: 'Authentication',
    fieldWeights: {
      USERNAME: 1.5,
      EMAIL: 1.2,
      PASSWORD: 2.0,
    },
    urlPatterns: [/login/i, /signin/i, /sign-in/i, /logon/i, /auth/i],
    actionPatterns: [/log\s*in/i, /sign\s*in/i, /submit/i, /enter/i],
    minFields: 2,
    maxFields: 4,
    prior: 0.15,
  },
  {
    purpose: 'AUTH_REGISTER',
    domain: 'Authentication',
    fieldWeights: {
      USERNAME: 1.2,
      EMAIL: 1.5,
      PASSWORD: 1.5,
      CONFIRM_PASSWORD: 2.0,
      FIRST_NAME: 1.0,
      LAST_NAME: 1.0,
    },
    urlPatterns: [/register/i, /signup/i, /sign-up/i, /create.?account/i, /join/i],
    actionPatterns: [/register/i, /sign\s*up/i, /create/i, /join/i],
    minFields: 3,
    maxFields: 10,
    prior: 0.1,
  },
  {
    purpose: 'AUTH_FORGOT_PASSWORD',
    domain: 'Authentication',
    fieldWeights: {
      EMAIL: 2.0,
      USERNAME: 1.0,
    },
    urlPatterns: [/forgot/i, /reset/i, /recover/i, /password/i],
    actionPatterns: [/reset/i, /recover/i, /send/i, /submit/i],
    minFields: 1,
    maxFields: 2,
    prior: 0.05,
  },
  {
    purpose: 'AUTH_RESET_PASSWORD',
    domain: 'Authentication',
    fieldWeights: {
      PASSWORD: 2.0,
      CONFIRM_PASSWORD: 2.0,
    },
    urlPatterns: [/reset/i, /new.?password/i, /change.?password/i],
    actionPatterns: [/reset/i, /change/i, /update/i, /save/i],
    minFields: 1,
    maxFields: 3,
    prior: 0.05,
  },

  // ========== USER/PROFILE DOMAIN ==========
  {
    purpose: 'PROFILE_EDIT',
    domain: 'User',
    fieldWeights: {
      FIRST_NAME: 1.5,
      LAST_NAME: 1.5,
      EMAIL: 1.0,
      PHONE: 1.0,
      ADDRESS: 1.0,
      CITY: 1.0,
      STATE: 1.0,
      ZIP_CODE: 1.0,
      DESCRIPTION: 0.8,
    },
    urlPatterns: [/profile/i, /account/i, /settings/i, /user/i, /edit/i],
    actionPatterns: [/save/i, /update/i, /submit/i],
    minFields: 2,
    maxFields: 15,
    prior: 0.1,
  },

  // ========== CONTACT DOMAIN ==========
  {
    purpose: 'CONTACT_FORM',
    domain: 'Contact',
    fieldWeights: {
      EMAIL: 1.5,
      FULL_NAME: 1.0,
      FIRST_NAME: 0.8,
      LAST_NAME: 0.8,
      PHONE: 0.5,
      MESSAGE: 2.0,
      DESCRIPTION: 1.5,
    },
    urlPatterns: [/contact/i, /support/i, /help/i, /feedback/i],
    actionPatterns: [/send/i, /submit/i, /contact/i],
    minFields: 2,
    maxFields: 6,
    prior: 0.08,
  },

  // ========== SEARCH DOMAIN ==========
  {
    purpose: 'SEARCH_FORM',
    domain: 'Search',
    fieldWeights: {
      SEARCH: 3.0,
    },
    urlPatterns: [/search/i, /find/i, /query/i],
    actionPatterns: [/search/i, /find/i, /go/i],
    minFields: 1,
    maxFields: 5,
    prior: 0.1,
  },

  // ========== FINANCIAL/BANKING DOMAIN ==========
  {
    purpose: 'BANK_ACCOUNT_CREATE',
    domain: 'Banking',
    fieldWeights: {
      ROUTING_NUMBER: 2.0,
      ACCOUNT_NUMBER: 2.0,
      BANK_NAME: 1.5,
    },
    urlPatterns: [/bank/i, /account/i, /financial/i, /payment/i],
    actionPatterns: [/save/i, /add/i, /create/i, /link/i],
    minFields: 2,
    maxFields: 5,
    prior: 0.05,
  },
  {
    purpose: 'PAYMENT_FORM',
    domain: 'Payment',
    fieldWeights: {
      CARD_NUMBER: 2.0,
      CARD_EXPIRY: 2.0,
      CARD_CVV: 2.0,
      CARD_NAME: 1.5,
      AMOUNT: 1.0,
    },
    urlPatterns: [/pay/i, /checkout/i, /card/i, /billing/i],
    actionPatterns: [/pay/i, /checkout/i, /submit/i, /complete/i],
    minFields: 3,
    maxFields: 8,
    prior: 0.07,
  },
  {
    purpose: 'TRANSACTION_CREATE',
    domain: 'Transaction',
    fieldWeights: {
      AMOUNT: 2.0,
      DESCRIPTION: 1.0,
      ACCOUNT_NUMBER: 1.0,
    },
    urlPatterns: [/transaction/i, /transfer/i, /send/i, /request/i],
    actionPatterns: [/send/i, /transfer/i, /request/i, /submit/i, /create/i],
    minFields: 2,
    maxFields: 6,
    prior: 0.06,
  },

  // ========== E-COMMERCE DOMAIN ==========
  {
    purpose: 'CHECKOUT_ADDRESS',
    domain: 'Checkout',
    fieldWeights: {
      FIRST_NAME: 1.0,
      LAST_NAME: 1.0,
      ADDRESS: 2.0,
      ADDRESS_2: 1.0,
      CITY: 1.5,
      STATE: 1.5,
      ZIP_CODE: 1.5,
      COUNTRY: 1.0,
      PHONE: 0.8,
    },
    urlPatterns: [/checkout/i, /shipping/i, /address/i, /delivery/i],
    actionPatterns: [/continue/i, /next/i, /save/i, /submit/i],
    minFields: 4,
    maxFields: 12,
    prior: 0.08,
  },
  {
    purpose: 'PRODUCT_CREATE',
    domain: 'Product',
    fieldWeights: {
      TITLE: 1.5,
      DESCRIPTION: 1.5,
      AMOUNT: 1.5, // price
      NUMBER: 1.0, // quantity/stock
    },
    urlPatterns: [/product/i, /item/i, /add/i, /create/i, /new/i],
    actionPatterns: [/create/i, /add/i, /save/i, /publish/i],
    minFields: 2,
    maxFields: 10,
    prior: 0.05,
  },

  // ========== GENERIC/CRUD DOMAIN ==========
  {
    purpose: 'CRUD_CREATE',
    domain: 'Generic',
    fieldWeights: {
      TITLE: 1.0,
      DESCRIPTION: 1.0,
    },
    urlPatterns: [/new/i, /create/i, /add/i],
    actionPatterns: [/create/i, /add/i, /save/i, /submit/i],
    minFields: 1,
    maxFields: 20,
    prior: 0.06,
  },
  {
    purpose: 'CRUD_EDIT',
    domain: 'Generic',
    fieldWeights: {
      TITLE: 1.0,
      DESCRIPTION: 1.0,
    },
    urlPatterns: [/edit/i, /update/i, /modify/i],
    actionPatterns: [/update/i, /save/i, /submit/i],
    minFields: 1,
    maxFields: 20,
    prior: 0.06,
  },
];

// ============================================================================
// NAIVE BAYES CLASSIFIER
// ============================================================================

interface FormPurposeScore {
  purpose: string;
  domain: string;
  score: number;
  signals: Signal[];
}

/**
 * Calculate purpose scores using Naive Bayes-style approach
 */
function calculatePurposeScores(
  fields: ClassifiedField[],
  url: string,
  submitText?: string
): FormPurposeScore[] {
  const scores: FormPurposeScore[] = [];
  
  // Build field type frequency map
  const fieldTypeCounts: Record<string, number> = {};
  for (const field of fields) {
    const type = field.semantic.type;
    fieldTypeCounts[type] = (fieldTypeCounts[type] || 0) + 1;
  }
  
  for (const profile of formPurposeProfiles) {
    const signals: Signal[] = [];
    let logProbability = Math.log(profile.prior);
    
    // 1. Field composition likelihood
    let fieldScore = 0;
    for (const [fieldType, weight] of Object.entries(profile.fieldWeights)) {
      const count = fieldTypeCounts[fieldType] || 0;
      if (count > 0) {
        fieldScore += weight * Math.min(count, 2); // Cap at 2 to avoid over-weighting
        signals.push({
          source: 'field-composition',
          type: profile.purpose,
          confidence: weight / 2,
          weight: 0.5,
          evidence: `${fieldType} x${count}`,
        });
      }
    }
    
    // Normalize field score
    if (fieldScore > 0) {
      const normalizedFieldScore = fieldScore / (Object.keys(profile.fieldWeights).length * 2);
      logProbability += Math.log(normalizedFieldScore + 0.1);
    } else {
      logProbability += Math.log(0.01); // Penalty for no matching fields
    }
    
    // 2. URL pattern matching
    for (const pattern of profile.urlPatterns) {
      if (pattern.test(url)) {
        logProbability += Math.log(3); // Boost
        signals.push({
          source: 'url-pattern',
          type: profile.purpose,
          confidence: 0.8,
          weight: 0.3,
          evidence: `URL matches ${pattern}`,
        });
        break; // Only count once
      }
    }
    
    // 3. Submit button text
    if (submitText) {
      for (const pattern of profile.actionPatterns) {
        if (pattern.test(submitText)) {
          logProbability += Math.log(2); // Boost
          signals.push({
            source: 'action-pattern',
            type: profile.purpose,
            confidence: 0.7,
            weight: 0.2,
            evidence: `submit text matches ${pattern}`,
          });
          break;
        }
      }
    }
    
    // 4. Field count penalty/boost
    const fieldCount = fields.length;
    if (fieldCount >= profile.minFields && fieldCount <= profile.maxFields) {
      logProbability += Math.log(1.5); // In expected range
    } else if (fieldCount < profile.minFields) {
      logProbability += Math.log(0.5); // Too few fields
    } else {
      logProbability += Math.log(0.7); // Too many fields
    }
    
    scores.push({
      purpose: profile.purpose,
      domain: profile.domain,
      score: Math.exp(logProbability),
      signals,
    });
  }
  
  // Normalize scores to sum to 1
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  for (const score of scores) {
    score.score = score.score / totalScore;
  }
  
  return scores.sort((a, b) => b.score - a.score);
}

// ============================================================================
// MAIN FORM CLASSIFIER
// ============================================================================

/**
 * Classify a form's purpose
 */
export function classifyForm(form: RawFormData): ClassifiedForm {
  // First, classify all fields
  const classifiedFields = classifyFields(form.fields);
  
  // Calculate purpose scores
  const scores = calculatePurposeScores(
    classifiedFields,
    form.route || form.url || '',
    form.submitText
  );
  
  const winner = scores[0];
  const runnerUp = scores[1];
  
  // Calculate confidence (gap between winner and runner-up)
  const confidence = winner.score - (runnerUp?.score || 0);
  
  return {
    raw: form,
    purpose: {
      type: winner.purpose,
      confidence: Math.min(winner.score + confidence, 0.99),
      signals: winner.signals,
    },
    domain: {
      primary: winner.domain,
      confidence: winner.score,
    },
    fields: classifiedFields,
    alternatives: scores.slice(1, 4).map(s => ({
      purpose: s.purpose,
      domain: s.domain,
      confidence: s.score,
    })),
  };
}

/**
 * Classify multiple forms
 */
export function classifyForms(forms: RawFormData[]): ClassifiedForm[] {
  return forms.map(classifyForm);
}

/**
 * Get domain distribution from forms
 */
export function getDomainDistribution(forms: ClassifiedForm[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const form of forms) {
    const domain = form.domain.primary;
    distribution[domain] = (distribution[domain] || 0) + 1;
  }
  return distribution;
}
