/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
    root: true,
    extends: [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/eslint-config-typescript/recommended",
    ],
    env: {
        "vue/setup-compiler-macros": true,
        node: true,
        browser: true,
        es6: true,
    },
    overrides: [
        {
            files: ["cypress/integration/**.spec.{js,ts,jsx,tsx}"],
            extends: ["plugin:cypress/recommended"],
        },
    ],
};
