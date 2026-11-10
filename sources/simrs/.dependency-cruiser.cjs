/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internals',
      severity: 'error',
      comment: 'Modul hanya boleh mengakses modul lain via index.js',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/(?!index\\.js$)',
        pathNot: '^src/modules/$1/'
      }
    },
    {
      name: 'core-must-not-depend-on-modules',
      severity: 'error',
      comment: 'Core tidak boleh meng-import modules kecuali register-models.js untuk bootstrap',
      from: { path: '^src/core/', pathNot: '^src/core/database/register-models\\.js$' },
      to: { path: '^src/modules/' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    }
  }
};

