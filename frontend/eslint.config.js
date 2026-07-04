const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    {
        ignores: ["public/**"]
    },
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn"
        }
    }
];
