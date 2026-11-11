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

test('Architecture Guardrail 1: Tidak boleh ada import cross-module ke internal folder modul lain', () => {
  const modulesDir = path.resolve('src/modules');
  if (!fs.existsSync(modulesDir)) return;

  const files = scanDirectory(modulesDir);
  const violations = [];

  // Tangkap semua relative import ke internal folder modul lain di kedalaman berapa pun (../ atau ../../ dst)
  const internalFolders = '(models|repositories|handlers|validators|events|services|subscribers|workers|clients)';
  const crossModuleRegex = new RegExp(`from\\s+['"](?:\\.\\.\\/)+([a-zA-Z0-9_-]+)\\/${internalFolders}`);

  for (const file of files) {
    // Dapatkan nama modul pemilik file saat ini: src/modules/<moduleName>/...
    const relFromModules = path.relative(modulesDir, file);
    const currentModule = relFromModules.split(path.sep)[0];

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const match = line.match(crossModuleRegex);
      if (match) {
        const targetModule = match[1];
        if (targetModule !== currentModule && targetModule !== 'core') {
          violations.push(`${file}:${idx + 1} -> ${line.trim()}`);
        }
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Ditemukan impor ilegal antar modul:\n${violations.join('\n')}`
  );
});

test('Architecture Guardrail 2: Handler dilarang meng-import Repository atau Model secara langsung (wajib lewat Service)', () => {
  const modulesDir = path.resolve('src/modules');
  if (!fs.existsSync(modulesDir)) return;

  const files = scanDirectory(modulesDir).filter((f) => f.includes(`${path.sep}handlers${path.sep}`));
  const violations = [];
  const bypassServiceRegex = /from\s+['"](?:\.\.\/)+(repositories|models)\//;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (bypassServiceRegex.test(line)) {
        violations.push(`${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Ditemukan Handler yang mem-bypass Service Layer:\n${violations.join('\n')}`
  );
});

test('Architecture Guardrail 3: Zero-Class Policy (Wajib menggunakan plain function / factory function di src/)', () => {
  const srcDir = path.resolve('src');
  if (!fs.existsSync(srcDir)) return;

  const files = scanDirectory(srcDir);
  const violations = [];
  const classRegex = /^\s*(?:export\s+(?:default\s+)?)?class\s+[A-Za-z0-9_]+/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (classRegex.test(line)) {
        violations.push(`${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Ditemukan deklarasi ES6 class (melanggar prinsip Functional & Zero-Class):\n${violations.join('\n')}`
  );
});
