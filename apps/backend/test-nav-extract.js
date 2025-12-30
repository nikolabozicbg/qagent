const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const code = `
import { Link } from 'react-router-dom';

function RegisterForm() {
  return (
    <div>
      <Link to="/login">Login</Link>
      <Link to="/terms">Terms</Link>
    </div>
  );
}
`;

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const navigations = [];

traverse(ast, {
  JSXAttribute: (path) => {
    const node = path.node;
    if (node.name && node.value) {
      const attrName = node.name.name;
      
      if ((attrName === 'href' || attrName === 'to') && node.value.type === 'StringLiteral') {
        navigations.push({
          target: node.value.value,
          trigger: 'click'
        });
      }
    }
  }
});

console.log('Extracted navigations:', JSON.stringify(navigations, null, 2));
