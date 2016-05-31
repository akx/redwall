module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'rules': {
    'arrow-body-style': ['error', 'as-needed'],
    'arrow-parens': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'complexity': [0, 11],
    'curly': [2, 'multi-line'],
    'eqeqeq': [2, 'allow-null'],
    'indent': ['error', 2],
    'no-console': ['off'],
    'object-shorthand': ['warn', 'always'],
    'prefer-arrow-callback': ['warn'],
    'prefer-const': ['error'],
    'quotes': ['error', 'single'],
    'sort-imports': 'warn',
  }
};
