import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";
import globals from "globals";

export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: {
      "import/order": ["warn", { "newlines-between": "always", alphabetize: { order: "asc" } }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    ignores: ["dist/**", "build/**", ".turbo/**", "coverage/**"],
  },
  {
    // Node-run CJS config/tooling files (jest.config.cjs, vite.config.ts, ...).
    files: ["**/*.config.{js,cjs,mjs,ts}"],
    languageOptions: { globals: globals.node },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
);

export default baseConfig;
