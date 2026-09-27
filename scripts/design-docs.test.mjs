import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'design-docs-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const dir of ['scripts', 'src/routes', 'src/lib/api', 'docs/design']) fs.mkdirSync(path.join(cwd, dir), { recursive: true });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(cwd, 'node_modules'), 'dir');
  for (const name of ['design-inventory.mjs', 'audit-design-docs.mjs']) fs.copyFileSync(path.join(root, 'scripts', name), path.join(cwd, 'scripts', name));
  fs.writeFileSync(path.join(cwd, 'src/routes/router.tsx'), `createBrowserRouter([{ element: <Shell />, children: [{ path: '/app', element: <Member />, children: [{ index: true, element: <Home /> }, { path: 'vps/:id', element: <Detail /> }, ...adminFinanceRoutes] }] }]);`);
  fs.writeFileSync(path.join(cwd, 'src/routes/adminFinanceRoutes.tsx'), `export const adminFinanceRoutes = [{ element: <Gate />, children: [{path:'payments',element:<Payments />}]}];`);
  fs.writeFileSync(path.join(cwd, 'src/routes/securityAdvisoryAdminRoutes.tsx'), 'export const securityAdvisoryAdminRoutes = [];');
  fs.writeFileSync(path.join(cwd, 'src/lib/api/vps.ts'), 'export {};');
  fs.writeFileSync(path.join(cwd, 'src/lib/api/vps.test.ts'), 'test fixture');
  for (const name of ['README.md','SPEC.md','docs/README.md','docs/CANONICAL_DOCS.md','WORK_LOG.md']) fs.writeFileSync(path.join(cwd,name),'# Fixture\n');
  fs.writeFileSync(path.join(cwd,'docs/design/API_CONTRACTS.md'),'# API\n');
  fs.writeFileSync(path.join(cwd,'docs/design/REQUIREMENTS.md'),'| REQ-001 | Requirement |\n');
  const run = (...args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
  assert.equal(run('scripts/design-inventory.mjs','--write').status,0);
  return {cwd, run};
}

test('inventory includes nested/index routes, imported gates and API modules', t => {
  const {cwd,run}=fixture(t);
  const content=fs.readFileSync(path.join(cwd,'docs/design/IMPLEMENTATION_INVENTORY.md'),'utf8');
  assert.match(content,/`\/app\/vps\/:id`/);
  assert.match(content,/`\/app` \| index/);
  assert.match(content,/`\/app\/payments`/);
  assert.match(content,/<Shell \/> → <Member \/> → <Gate \/>/);
  assert.match(content,/API adapter modules \(1\)/);
  assert.equal(run('scripts/audit-design-docs.mjs').status,0);
});

test('audit rejects stale inventory after a route or adapter is added',t=>{
  const {cwd,run}=fixture(t);
  fs.writeFileSync(path.join(cwd,'src/lib/api/dns.ts'),'export {};');
  const result=run('scripts/audit-design-docs.mjs');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/inventory is stale/);
});

test('audit rejects broken links and duplicate or undefined requirement IDs',t=>{
  const {cwd,run}=fixture(t);
  fs.writeFileSync(path.join(cwd,'docs/design/REQUIREMENTS.md'),'| REQ-001 | One |\n| REQ-001 | Two |\nREQ-999\n[missing](missing.md)\n');
  const result=run('scripts/audit-design-docs.mjs');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/missing or external local link/);
  assert.match(result.stderr,/duplicated/);
  assert.match(result.stderr,/unknown REQ-999/);
});

test('inventory fails rather than silently omit an unresolved route spread',t=>{
  const {cwd,run}=fixture(t);
  fs.writeFileSync(path.join(cwd,'src/routes/router.tsx'),'createBrowserRouter([...unknownRoutes]);');
  const result=run('scripts/design-inventory.mjs','--write');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Unresolved route spread/);
});
