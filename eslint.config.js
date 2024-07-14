import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const compat = new FlatCompat();

export default tseslint.config(
  { ignores: ["eslint.config.js"] },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  eslint.configs.recommended,
  ...compat.extends("eslint-config-airbnb-base"),
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    rules: {
      "import/prefer-default-export": "off",
      "import/extensions": ["error", "always", { ignorePackages: true }],
      "import/order": "off",
      "no-new": "off",

      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "enum", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase"] },
        {
          // everything should be camelCase by default
          selector: "default",
          format: ["camelCase"],
        },
        {
          // functions can also be PascalCase (but have to be globally accessed)
          selector: "variable",
          format: ["PascalCase", "camelCase"],
          modifiers: ["global"],
          types: ["function"],
        },
        {
          // other variables can be UPPER_CASE (but have to be globally accessed)
          selector: "variable",
          format: ["UPPER_CASE", "camelCase"],
          modifiers: ["global"],
        },
        {
          // unused values must start with an underscore
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "require",
          modifiers: ["unused"],
        },
        {
          // types must be PascalCase
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/lines-between-class-members": "off",
      "@typescript-eslint/ban-types": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      "@typescript-eslint/no-unsafe-return": "error",
    },
  },
);
