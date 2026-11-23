import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);

const fields = {};
if (frontmatter) {
  for (const line of frontmatter[1].split('\n')) {
    const separator = line.indexOf(': ');
    if (separator > 0) {
      fields[line.slice(0, separator)] = line.slice(separator + 2).trim();
    }
  }
}

test('frontmatter соответствует стандарту Agent Skills', () => {
  assert.ok(frontmatter, 'frontmatter не найден');
  assert.equal(fields.name, 'sankeymatic');
  assert.match(fields.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(fields.name.length <= 64);
  assert.ok(fields.description.length > 0);
  assert.ok(fields.description.length <= 1024);
  assert.equal(fields.license, 'MIT');
  assert.ok(fields.compatibility.length > 0);
  assert.ok(fields.compatibility.length <= 500);
});

test('оговорка о проверке только в OpenCode присутствует', () => {
  assert.match(fields.compatibility, /только в OpenCode/i);
  assert.match(text, /проверен только в OpenCode/i);
});
