/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'zero-cross-module-dependency',
      severity: 'error',
      comment: 'Zero Cross-Module Dependency: Modul dilarang meng-import modul lain secara langsung (termasuk index.js). Gunakan Core EventBus untuk komunikasi lintas modul.',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
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
