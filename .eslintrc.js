module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'rules': {
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'always-multiline'],
    'no-console': ['off'],
    'prefer-arrow-callback': ['warn'],
  }
};
