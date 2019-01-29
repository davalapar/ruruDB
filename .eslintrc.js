module.exports = {
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2018,
  },
  "extends": ["eslint-config-airbnb"],
  "env": {
      "es6": true,
      "node": true,
      "jest": true,
  },
  "plugins": [
      "react"
  ],
  "rules": {
    "semi": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "no-continue": ["off"]
  }
};
