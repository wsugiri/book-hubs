import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    files: ['src/**/*.js'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core-bootstrap', pattern: 'src/core/database/register-models.js', mode: 'file' },
        { type: 'core', pattern: 'src/core/**' },
        { type: 'module-public', pattern: 'src/modules/*/index.js', mode: 'file', capture: ['module'] },
        { type: 'module-internal', pattern: 'src/modules/*/**', capture: ['module'] }
      ]
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'core-bootstrap', allow: ['core', 'module-public'] },
          { from: 'core', allow: ['core'] },
          // Internal modul boleh ke core, ke internal modul SENDIRI, dan ke index.js modul LAIN
          { from: 'module-internal', allow: [
            'core',
            ['module-internal', { module: '${from.module}' }],
            'module-public'
          ] },
          { from: 'module-public', allow: ['core', ['module-internal', { module: '${from.module}' }]] }
        ]
      }]
    }
  }
];
