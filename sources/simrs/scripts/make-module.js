import fs from 'node:fs';
import path from 'node:path';

const moduleName = process.argv[2];
if (!moduleName) {
  console.error('❌ Mohon sertakan nama modul! Contoh: node scripts/make-module.js laboratory');
  process.exit(1);
}

const baseDir = path.resolve('src/modules', moduleName);
const folders = ['handlers', 'services', 'repositories', 'models', 'validators', 'events'];

if (fs.existsSync(baseDir)) {
  console.error(`❌ Modul "${moduleName}" sudah ada di ${baseDir}!`);
  process.exit(1);
}

// 1. Buat struktur folder
folders.forEach((f) => fs.mkdirSync(path.join(baseDir, f), { recursive: true }));

// 2. Buat file template routes.js
fs.writeFileSync(
  path.join(baseDir, 'routes.js'),
  `import { Hono } from 'hono';

export const ${moduleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Routes = new Hono();

${moduleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Routes.get('/health', (c) => c.json({ module: '${moduleName}', status: 'UP' }));
`
);

// 3. Buat file template index.js (Public Contract)
const camelCaseName = moduleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
fs.writeFileSync(
  path.join(baseDir, 'index.js'),
  `// Public API untuk modul ${moduleName}
export { ${camelCaseName}Routes } from './routes.js';

export const ${camelCaseName}Service = {
  // Daftarkan fungsi kontrak publik yang diizinkan dipanggil oleh modul lain di sini
};
`
);

console.info(`✅ Berhasil membuat scaffold modul "${moduleName}" di:`);
console.info(`   src/modules/${moduleName}/`);
console.info(`   ├── handlers/ | services/ | repositories/ | models/ | validators/ | events/`);
console.info(`   ├── routes.js`);
console.info(`   └── index.js (Public Contract)`);

