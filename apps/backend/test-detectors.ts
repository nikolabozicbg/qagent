import { UILibraryDetectorService } from './src/analysis/ui-library-detector.service';
import { StateManagementDetectorService } from './src/analysis/state-management-detector.service';

const workspacePath = '/Users/nikolabozic/Projects/cypress-realworld-app';

// Test UI Library Detection
console.log('🎨 Testing UI Library Detection...\n');
const uiDetector = new UILibraryDetectorService();
const uiLibraries = uiDetector.detectLibraries(workspacePath);

console.log(`Found ${uiLibraries.length} UI libraries:`);
for (const lib of uiLibraries) {
  console.log(`  ✅ ${lib.name} (confidence: ${lib.confidence}%)`);
  console.log(`     Components: ${lib.components.slice(0, 5).join(', ')}${lib.components.length > 5 ? '...' : ''}`);
}

// Test State Management Detection
console.log('\n🔄 Testing State Management Detection...\n');
const stateDetector = new StateManagementDetectorService();
const stateManagement = stateDetector.detectStateManagement(workspacePath);

console.log(`Found ${stateManagement.length} state management solutions:`);
for (const sm of stateManagement) {
  console.log(`  ✅ ${sm.type.toUpperCase()} (confidence: ${sm.confidence}%)`);
  console.log(`     Files: ${sm.files.length} detected`);
  
  // If XState, parse machines
  if (sm.type === 'xstate' && sm.files.length > 0) {
    console.log(`\n     📋 Parsing XState machines...`);
    for (const file of sm.files.slice(0, 3)) { // Parse first 3
      const machine = stateDetector.parseXStateMachine(file);
      if (machine) {
        console.log(`       • ${machine.name}:`);
        console.log(`         States: ${machine.states.length} (${machine.states.slice(0, 3).join(', ')}...)`);
        console.log(`         Services: ${machine.services.length}`);
        
        if (machine.services.length > 0) {
          console.log(`         Services with API calls:`);
          for (const service of machine.services) {
            if (service.apiCall) {
              console.log(`           🌐 ${service.name}: ${service.apiCall.method} ${service.apiCall.endpoint}`);
            } else {
              console.log(`           • ${service.name}: (no API call detected)`);
            }
          }
        }
      }
    }
  }
}

console.log('\n✅ Detection complete!');
