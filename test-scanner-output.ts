import { ProjectScanner } from './apps/desktop/dist-electron/scanner.js';

async function main() {
  const scanner = new ProjectScanner('/Users/nikolabozic/Projects/ecommerce');
  const payload = await scanner.scan();
  
  console.log('\n=== FORMS ANALYSIS ===\n');
  
  for (const form of payload.forms.slice(0, 10)) {
    console.log(`\n📋 ${form.name}`);
    console.log(`   Route: ${form.route || 'NULL'}`);
    console.log(`   Component: ${form.componentName}`);
    console.log(`   File: ${form.filePath}`);
    console.log(`   Fields (${form.fields.length}):`);
    
    for (const field of form.fields) {
      const hasRealName = !field.name.startsWith('field-');
      const status = hasRealName ? '✅' : '❌';
      console.log(`     ${status} name="${field.name}" type="${field.type}" label="${field.label || 'null'}"`);
      if (field.selector) {
        console.log(`        selector: ${field.selector}`);
      }
    }
  }
  
  // Summary
  const totalFields = payload.forms.reduce((sum, f) => sum + f.fields.length, 0);
  const resolvedFields = payload.forms.reduce((sum, f) => 
    sum + f.fields.filter(field => !field.name.startsWith('field-')).length, 0);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total forms: ${payload.forms.length}`);
  console.log(`Total fields: ${totalFields}`);
  console.log(`Resolved fields: ${resolvedFields} (${Math.round(resolvedFields/totalFields*100)}%)`);
  console.log(`Unresolved (field-N): ${totalFields - resolvedFields}`);
}

main().catch(console.error);
