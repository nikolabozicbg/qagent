/**
 * Test script for Intelligent Discovery V3
 * Tests on both cypress-realworld-app and ecommerce
 */

import { runIntelligentDiscovery, assessQuality } from './apps/backend/src/modules/analysis/intelligence/intelligent-discovery';

// Mock scanner data based on actual app structures

const cypressRealworldForms = [
  {
    id: 'form-signin',
    name: 'Sign In Form',
    component: 'SignInPage',
    file: 'src/pages/SignInPage.tsx',
    route: '/signin',
    fields: [
      { name: 'username', type: 'text', label: 'Username', required: true, placeholder: 'Username' },
      { name: 'password', type: 'password', label: 'Password', required: true, placeholder: 'Password' },
    ],
    submitButton: { text: 'Sign In', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-signup',
    name: 'Sign Up Form',
    component: 'SignUpPage',
    file: 'src/pages/SignUpPage.tsx',
    route: '/signup',
    fields: [
      { name: 'firstName', type: 'text', label: 'First Name', required: true },
      { name: 'lastName', type: 'text', label: 'Last Name', required: true },
      { name: 'username', type: 'text', label: 'Username', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true },
      { name: 'confirmPassword', type: 'password', label: 'Confirm Password', required: true },
    ],
    submitButton: { text: 'Sign Up', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-bank-account',
    name: 'Bank Account Form',
    component: 'BankAccountForm',
    file: 'src/components/BankAccountForm.tsx',
    route: '/bankaccounts/new',
    fields: [
      { name: 'bankName', type: 'text', label: 'Bank Name', required: true, dataTest: 'bankaccount-bankName-input' },
      { name: 'routingNumber', type: 'text', label: 'Routing Number', required: true, dataTest: 'bankaccount-routingNumber-input' },
      { name: 'accountNumber', type: 'text', label: 'Account Number', required: true, dataTest: 'bankaccount-accountNumber-input' },
    ],
    submitButton: { text: 'Save', selector: '[data-test="bankaccount-submit"]' },
  },
  {
    id: 'form-transaction',
    name: 'Transaction Form',
    component: 'TransactionCreateStepTwo',
    file: 'src/components/TransactionCreateStepTwo.tsx',
    route: '/transaction/new',
    fields: [
      { name: 'amount', type: 'number', label: 'Amount', required: true, dataTest: 'transaction-create-amount-input' },
      { name: 'description', type: 'text', label: 'Add a note', required: false, dataTest: 'transaction-create-description-input' },
    ],
    submitButton: { text: 'Pay', selector: '[data-test="transaction-create-submit-payment"]' },
  },
  {
    id: 'form-user-settings',
    name: 'User Settings Form',
    component: 'UserSettingsForm',
    file: 'src/components/UserSettingsForm.tsx',
    route: '/user/settings',
    fields: [
      { name: 'firstName', type: 'text', label: 'First Name', required: true, dataTest: 'user-settings-firstName-input' },
      { name: 'lastName', type: 'text', label: 'Last Name', required: true, dataTest: 'user-settings-lastName-input' },
      { name: 'email', type: 'email', label: 'Email', required: true, dataTest: 'user-settings-email-input' },
      { name: 'phoneNumber', type: 'tel', label: 'Phone Number', required: false, dataTest: 'user-settings-phoneNumber-input' },
    ],
    submitButton: { text: 'Save', selector: '[data-test="user-settings-submit"]' },
  },
];

const ecommerceForms = [
  {
    id: 'form-login',
    name: 'Login Form',
    component: 'LoginPage',
    file: 'src/pages/auth/LoginPage.tsx',
    route: '/login',
    fields: [
      { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'Enter your email' },
      { name: 'password', type: 'password', label: 'Password', required: true, placeholder: 'Enter your password' },
    ],
    submitButton: { text: 'Sign In', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-register',
    name: 'Registration Form',
    component: 'RegisterPage',
    file: 'src/pages/auth/RegisterPage.tsx',
    route: '/register',
    fields: [
      { name: 'name', type: 'text', label: 'Full Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true },
      { name: 'confirmPassword', type: 'password', label: 'Confirm Password', required: true },
    ],
    submitButton: { text: 'Create Account', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-product-create',
    name: 'Product Form',
    component: 'ProductForm',
    file: 'src/components/admin/ProductForm.tsx',
    route: '/admin/products/new',
    fields: [
      { name: 'name', type: 'text', label: 'Product Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description', required: false },
      { name: 'price', type: 'number', label: 'Price', required: true },
      { name: 'category', type: 'select', label: 'Category', required: true },
      { name: 'stock', type: 'number', label: 'Stock', required: true },
    ],
    submitButton: { text: 'Save Product', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-checkout',
    name: 'Checkout Form',
    component: 'CheckoutForm',
    file: 'src/components/checkout/CheckoutForm.tsx',
    route: '/checkout',
    fields: [
      { name: 'firstName', type: 'text', label: 'First Name', required: true },
      { name: 'lastName', type: 'text', label: 'Last Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'phone', type: 'tel', label: 'Phone', required: false },
      { name: 'address', type: 'text', label: 'Address', required: true },
      { name: 'city', type: 'text', label: 'City', required: true },
      { name: 'state', type: 'text', label: 'State', required: true },
      { name: 'zipCode', type: 'text', label: 'Zip Code', required: true },
    ],
    submitButton: { text: 'Place Order', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-contact',
    name: 'Contact Form',
    component: 'ContactPage',
    file: 'src/pages/ContactPage.tsx',
    route: '/contact',
    fields: [
      { name: 'name', type: 'text', label: 'Your Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'message', type: 'textarea', label: 'Message', required: true },
    ],
    submitButton: { text: 'Send Message', selector: 'button[type="submit"]' },
  },
  {
    id: 'form-search',
    name: 'Search Form',
    component: 'SearchBar',
    file: 'src/components/SearchBar.tsx',
    route: '/products',
    fields: [
      { name: 'search', type: 'search', label: null, required: false, placeholder: 'Search products...' },
    ],
    submitButton: { text: 'Search', selector: 'button[type="submit"]' },
  },
];

async function runTests() {
  console.log('='.repeat(60));
  console.log('INTELLIGENT DISCOVERY V3 - TEST RESULTS');
  console.log('='.repeat(60));
  
  // Test 1: cypress-realworld-app
  console.log('\n\n📱 TEST 1: cypress-realworld-app');
  console.log('-'.repeat(60));
  
  const cypressResult = await runIntelligentDiscovery(cypressRealworldForms, {
    minSuiteSize: 1,
    similarityThreshold: 0.45,
  });
  
  console.log('\n📊 RESULTS:');
  console.log(`   Forms processed: ${cypressResult.metadata.totalForms}`);
  console.log(`   Suites generated: ${cypressResult.suites.length}`);
  console.log(`   Test cases: ${cypressResult.metadata.totalCases}`);
  console.log(`   Test steps: ${cypressResult.metadata.totalSteps}`);
  console.log(`   Quality: ${Math.round(cypressResult.quality.overall * 100)}%`);
  console.log(`   Recommendation: ${cypressResult.quality.recommendation}`);
  
  console.log('\n🗂️  SUITES:');
  for (const suite of cypressResult.suites) {
    console.log(`\n   📁 ${suite.name} (${suite.domain.primary})`);
    console.log(`      Priority: ${suite.priority.level}`);
    console.log(`      Cases: ${suite.cases.length}`);
    for (const c of suite.cases) {
      console.log(`      - ${c.name} (${c.classification.type})`);
    }
  }
  
  // Test 2: ecommerce
  console.log('\n\n📱 TEST 2: ecommerce');
  console.log('-'.repeat(60));
  
  const ecommerceResult = await runIntelligentDiscovery(ecommerceForms, {
    minSuiteSize: 1,
    similarityThreshold: 0.45,
  });
  
  console.log('\n📊 RESULTS:');
  console.log(`   Forms processed: ${ecommerceResult.metadata.totalForms}`);
  console.log(`   Suites generated: ${ecommerceResult.suites.length}`);
  console.log(`   Test cases: ${ecommerceResult.metadata.totalCases}`);
  console.log(`   Test steps: ${ecommerceResult.metadata.totalSteps}`);
  console.log(`   Quality: ${Math.round(ecommerceResult.quality.overall * 100)}%`);
  console.log(`   Recommendation: ${ecommerceResult.quality.recommendation}`);
  
  console.log('\n🗂️  SUITES:');
  for (const suite of ecommerceResult.suites) {
    console.log(`\n   📁 ${suite.name} (${suite.domain.primary})`);
    console.log(`      Priority: ${suite.priority.level}`);
    console.log(`      Cases: ${suite.cases.length}`);
    for (const c of suite.cases) {
      console.log(`      - ${c.name} (${c.classification.type})`);
    }
  }
  
  // Summary comparison
  console.log('\n\n' + '='.repeat(60));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(60));
  console.log('\n                     | cypress-realworld | ecommerce');
  console.log('---------------------|-------------------|----------');
  console.log(`Forms                | ${cypressResult.metadata.totalForms.toString().padStart(17)} | ${ecommerceResult.metadata.totalForms}`);
  console.log(`Suites               | ${cypressResult.suites.length.toString().padStart(17)} | ${ecommerceResult.suites.length}`);
  console.log(`Test Cases           | ${cypressResult.metadata.totalCases.toString().padStart(17)} | ${ecommerceResult.metadata.totalCases}`);
  console.log(`Test Steps           | ${cypressResult.metadata.totalSteps.toString().padStart(17)} | ${ecommerceResult.metadata.totalSteps}`);
  console.log(`Quality              | ${(Math.round(cypressResult.quality.overall * 100) + '%').padStart(17)} | ${Math.round(ecommerceResult.quality.overall * 100)}%`);
  console.log(`Field Resolution     | ${(Math.round(cypressResult.quality.fieldResolution * 100) + '%').padStart(17)} | ${Math.round(ecommerceResult.quality.fieldResolution * 100)}%`);
  console.log(`Selector Quality     | ${(Math.round(cypressResult.quality.selectorQuality * 100) + '%').padStart(17)} | ${Math.round(ecommerceResult.quality.selectorQuality * 100)}%`);
  console.log(`Recommendation       | ${cypressResult.quality.recommendation.padStart(17)} | ${ecommerceResult.quality.recommendation}`);
}

runTests().catch(console.error);
