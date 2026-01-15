import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const traverseDefault = (traverse as any).default || traverse;

const serviceCode = `
performLogin: async (ctx, event) => {
  return await httpClient
    .post(\`http://localhost:\${backendPort}/login\`, event)
    .then(({ data }) => {
      history.push("/");
      return data;
    })
    .catch((error) => {
      throw new Error("Username or password is invalid");
    });
}
`;

console.log('🔍 Parsing performLogin service...\n');

const ast = parser.parse(serviceCode, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

let depth = 0;

function logNode(node: any, label: string) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${label}: ${node.type}`);
  
  if (node.type === 'CallExpression') {
    console.log(`${indent}  callee:`, node.callee.type);
    if (node.callee.type === 'MemberExpression') {
      console.log(`${indent}    object:`, node.callee.object?.type, node.callee.object?.name);
      console.log(`${indent}    property:`, node.callee.property?.type, node.callee.property?.name);
    }
    if (node.arguments.length > 0) {
      console.log(`${indent}  arguments:`, node.arguments.map((a: any) => a.type).join(', '));
    }
  }
}

traverseDefault(ast, {
  enter(path: any) {
    depth++;
    if (path.node.type === 'CallExpression') {
      logNode(path.node, '🎯 CallExpression');
    }
    if (path.node.type === 'AwaitExpression') {
      logNode(path.node.argument, '⏳ AwaitExpression -> argument');
    }
  },
  exit() {
    depth--;
  }
});
