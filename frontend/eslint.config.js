const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    {
        ignores: ["public/dist/**"]
    },
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                htmx: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn"
        }
    }
];
