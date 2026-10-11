// Configuration séparée : conserve les règles Angular et ajoute des contrôles de maintenance.
const path = require('node:path');
module.exports = {
  extends: [path.resolve(__dirname, '../../frontend/.eslintrc.json')],
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        eqeqeq: ['warn', 'always'],
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-eval': 'error',
        'no-new-func': 'error',
        'no-unreachable': 'error',
        'no-constant-condition': 'error',
      },
    },
  ],
};
