import fs from 'node:fs';
import ts from 'typescript';

const routeFiles = ['src/routes/router.tsx', 'src/routes/adminFinanceRoutes.tsx', 'src/routes/securityAdvisoryAdminRoutes.tsx'];
const arrays = new Map();
let root;
for (const file of routeFiles) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      arrays.set(node.name.getText(source), { node: node.initializer, source, file });
    }
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'createBrowserRouter') {
      root = { node: node.arguments[0], source, file };
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (!root) throw new Error('Missing createBrowserRouter route root');
const rows = [];
function walk({ node, source, file }, parent = '', inherited = []) {
  if (!ts.isArrayLiteralExpression(node)) throw new Error(`Unsupported routes in ${file}`);
  for (const route of node.elements) {
    if (ts.isSpreadElement(route)) {
      const target = arrays.get(route.expression.getText(source));
      if (!target) throw new Error(`Unresolved route spread: ${route.getText(source)}`);
      walk(target, parent, inherited);
      continue;
    }
    if (!ts.isObjectLiteralExpression(route)) throw new Error(`Unsupported route: ${route.getText(source)}`);
    const props = Object.fromEntries(route.properties.map(p => {
      if (!ts.isPropertyAssignment(p)) throw new Error(`Unsupported route property: ${p.getText(source)}`);
      return [p.name.getText(source), p.initializer];
    }));
    const segment = props.path;
    if (segment && !ts.isStringLiteral(segment)) throw new Error('Nonliteral path needs inventory support');
    const own = segment?.text;
    const full = own?.startsWith('/') ? own : [parent.replace(/\/$/, ''), own].filter(Boolean).join('/');
    const routePath = full.startsWith('/') ? full : `/${full}`;
    const element = props.element?.getText(source).replace(/\s+/g, ' ') ?? '(layout only)';
    const layers = [...inherited, element];
    if (segment || props.index) {
      rows.push([routePath || '/', props.index ? 'index' : props.children ? 'layout' : 'page/redirect', element, inherited.join(' → '), file]);
    }
    if (props.children) walk({ node: props.children, source, file }, routePath, layers);
  }
}
walk(root);
const escape = s => s.replace(/\|/g, '&#124;').replace(/`/g, '&#96;');
const lines = ['# Generated implementation inventory', '',
  'Generated with `npm run docs:inventory`. Checked with `npm run audit:design-docs`.', '',
  'This is a source inventory, not proof of API permissions, feature parity, or test coverage.',
  'Paths are relative to the configured router basename. Parent layers include scope/auth',
  'wrappers; page-level action guards and API authorization still apply.', '',
  `## Routes (${rows.length} entries, including layouts and index routes)`, '',
  '| Route | Kind | Element | Parent layers | Source |', '| --- | --- | --- | --- | --- |'];
for (const [route, kind, element, layers, file] of rows) {
  lines.push(`| \`${escape(route)}\` | ${kind} | \`${escape(element)}\` | \`${escape(layers)}\` | [source](../../${file}) |`);
}
const adapters = fs.readdirSync('src/lib/api').filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort();
lines.push('', `## API adapter modules (${adapters.length})`, '',
  'Read these for request/response details. File presence does not prove that the deployed',
  'API implements every parameter; see [API contracts](API_CONTRACTS.md).', '');
for (const file of adapters) lines.push(`- [${file}](../../src/lib/api/${file})`);
lines.push('');
const output = 'docs/design/IMPLEMENTATION_INVENTORY.md';
const content = lines.join('\n');
if (process.argv.includes('--write')) fs.writeFileSync(output, content);
else if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== content) {
  throw new Error('Implementation inventory is stale. Run npm run docs:inventory and review the diff.');
}
console.log(`Design inventory: ${rows.length} routes, ${adapters.length} API modules`);
