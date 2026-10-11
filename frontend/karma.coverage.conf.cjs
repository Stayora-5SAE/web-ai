const path = require('node:path');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: { clearContext: false },
    reporters: ['progress', 'coverage'],
    browsers: ['ChromeHeadless'],
    coverageReporter: {
      dir: path.join(__dirname, 'coverage', 'stayora'),
      subdir: '.',
      includeAllSources: true,
      reporters: [
        { type: 'lcovonly', file: 'lcov.info', projectRoot: path.join(__dirname, '..') },
        { type: 'html' },
        { type: 'json-summary', file: 'coverage-summary.json' },
        { type: 'text-summary' },
      ],
    },
    restartOnFileChange: false,
  });
};
