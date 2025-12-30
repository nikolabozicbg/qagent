#!/usr/bin/env node

// Simulate EXACT format extension sends after loading from storage
const storedFlow = {
  "name": "👤 User Login",
  "description": "User completes login form",
  "priority": 1,
  "tags": ["form", "critical"],
  "steps": [],
  "components": [{"name": "loginForm", "path": "app/containers/LoginPage/loginForm.js"}],
  "status": "enriched",
  "enrichedData": {
    "components": [{
      "component": "app/containers/LoginPage/loginForm.js",
      "sourceCode": "...",
      "elements": [  // ❌ Extension has "elements" not "fields"
        {"selector": "#username", "type": "input"},
        {"selector": "#password", "type": "input"}
      ],
      "validations": [
        {"fieldName": "username", "rules": [{"errorMessage": "Required"}]},
        {"fieldName": "password", "rules": [{"errorMessage": "Required"}]}
      ],
      "apiCalls": [  // ❌ Extension has "apiCalls" not "apis"
        {"method": "POST", "endpoint": "/auth/login"}
      ],
      "stateVariables": []
    }],
    "testDataSuggestions": {},
    "edgeCases": ["Network failure"]
  }
};

(async () => {
  console.log('🧪 Testing STORED format (like extension sends)');
  console.log('================================================\n');
  
  const res = await fetch('http://localhost:3001/analyze/generate-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journey: storedFlow,
      workspacePath: '/Users/nikolabozic/Projects/truthy-frontend'
    })
  });
  
  const result = await res.json();
  
  console.log('Result:');
  console.log('  Success:', result.success);
  console.log('  Filename:', result.fileName);
  console.log('  Test cases:', result.stats?.testCases || 0);
  console.log('  Code length:', result.testCode?.length || 0);
  
  if (result.testCode) {
    console.log('\n✅ TEST GENERATION WORKS!');
    console.log('\nFirst 300 chars:');
    console.log(result.testCode.substring(0, 300));
  } else {
    console.log('\n❌ NO TEST CODE GENERATED');
    console.log('Error:', result.error);
  }
})();
