import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

test('the private nginx static policy permits the current inline bootstrap only', () => {
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const moduleSource = fs.readFileSync(new URL('../nixos/modules/webui.nix', import.meta.url), 'utf8');
  const inlineScripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(inlineScripts.length, 1);
  const hash = `sha256-${createHash('sha256').update(inlineScripts[0][1]).digest('base64')}`;
  assert.match(moduleSource, new RegExp(hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal([...moduleSource.matchAll(/sha256-/g)].length, 1);
  assert.match(moduleSource, /https:\/\/nominatim\.openstreetmap\.org/);
  assert.match(moduleSource, /https:\/\/www\.openstreetmap\.org/);
});
