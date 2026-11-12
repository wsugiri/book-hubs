import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    files: ['src/**/*.js'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core-bootstrap', pattern: 'src/core/database/register-models.js', mode: 'file' },
        { type: 'core', pattern: 'src/core/**' },
        { type: 'module', pattern: 'src/modules/*/**', capture: ['module'] }
      ]
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'core-bootstrap', allow: ['core', 'module'] },
          { from: 'core', allow: ['core'] },
              // Zero Cross-Module Dependency: Modul HANYA boleh meng-import core dan file di dalam modulnya sendiri
              {
                from: 'module', allow: [
                  'core',
              ['module', { module: '${from.module}' }]
            ]
          }
        ]
      }]
    }
  }
];
