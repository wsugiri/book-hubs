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

  test('Architecture Guardrail 1: Zero Cross-Module Dependency (Modul dilarang meng-import modul lain sama sekali)', () => {
    const modulesDir = path.resolve('src/modules');
    if (!fs.existsSync(modulesDir)) return;

    const files = scanDirectory(modulesDir);
    const violations = [];

    for (const file of files) {
      const relFromModules = path.relative(modulesDir, file);
      const currentModule = relFromModules.split(path.sep)[0];

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
            const importMatch = line.match(/from\s+['"](\.[^'"]+)['"]/);
            if (importMatch) {
              const importPath = importMatch[1];
              const resolvedTarget = path.resolve(path.dirname(file), importPath);

              // Jika file yang di-import berada di dalam src/modules/
              if (resolvedTarget.startsWith(modulesDir)) {
                const targetModule = path.relative(modulesDir, resolvedTarget).split(path.sep)[0];
                if (targetModule !== currentModule) {
                  violations.push(`${file}:${idx + 1} (${currentModule} -> ${targetModule}) -> ${line.trim()}`);
                }
              }
            }
          });
    }

    assert.strictEqual(
      violations.length,
      0,
        `Melanggar Zero Cross-Module Dependency! Ditemukan impor lintas modul:\n${violations.join('\n')}`
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
