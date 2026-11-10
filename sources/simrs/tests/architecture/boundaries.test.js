// tests/architecture/boundaries.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const scanDirectory = (dir) => {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(scanDirectory(fullPath));
    } else if (item.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
};

test('Architecture Guardrail: Tidak boleh ada import cross-module ke internal folder', () => {
  const modulesDir = path.resolve('src/modules');
  if (!fs.existsSync(modulesDir)) return;

  const files = scanDirectory(modulesDir);
  const violations = [];

  // Pola larangan: import dari module lain langsung ke models, repositories, handlers
  const forbiddenRegex = /from\s+['"]\.\.\/([a-zA-Z0-9_-]+)\/(models|repositories|handlers|validators|events)/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (forbiddenRegex.test(line)) {
        violations.push(`${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Ditemukan impor ilegal antar modul:\n${violations.join('\n')}`
  );
});

