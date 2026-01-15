import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as fs from 'fs';

const traverseDefault = (traverse as any).default || traverse;

const filePath = '/Users/nikolabozic/Projects/cypress-realworld-app/src/machines/authMachine.ts';
const code = fs.readFileSync(filePath, 'utf-8');

console.log('📖 Parsing authMachine.ts...\n');

try {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  
  console.log('✅ AST parsed successfully\n');
  console.log('🔍 Looking for Machine() call...\n');
  
  let found = false;
  
  traverseDefault(ast, {
    CallExpression(path: any) {
      const callee = path.node.callee;
      
      if (callee.type === 'Identifier' && callee.name === 'Machine') {
        console.log('✅ Found Machine() call!');
        console.log('   Arguments:', path.node.arguments.length);
        
        const configArg = path.node.arguments[0];
        const optionsArg = path.node.arguments[1];
        
        console.log('   Config type:', configArg?.type);
        console.log('   Options type:', optionsArg?.type);
        
        if (optionsArg && optionsArg.type === 'ObjectExpression') {
          console.log('   Options properties:', optionsArg.properties?.length);
          
          if (optionsArg.properties) {
            for (const prop of optionsArg.properties) {
              console.log('     Property type:', prop.type);
              console.log('     Key:', prop.key?.name || prop.key?.value);
              
              if ((prop.key?.name || prop.key?.value) === 'services') {
                console.log('     ✅ Found services!');
                const services = prop.value;
                console.log('     Services type:', services.type);
                console.log('     Services properties:', services.properties?.length);
                
                if (services.properties) {
                  console.log('\n     🔍 Iterating services:');
                  for (const serviceProp of services.properties) {
                    const serviceName = serviceProp.key?.name || serviceProp.key?.value;
                    console.log(`       • ${serviceName}`);
                  }
                }
              }
            }
          }
        }
        
        found = true;
      }
    }
  });
  
  if (!found) {
    console.log('❌ Machine() call not found');
  }
  
} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
