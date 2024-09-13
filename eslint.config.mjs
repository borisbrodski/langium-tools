import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: {} },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    files: ["src/**/*.{js,mjs,cjs,ts}"],
    rules: {
      semi: ["error", "always"],
    },
  },
  {
    files: ["test/**/*.{js,mjs,cjs,ts}"],
    rules: {
      semi: "off",
    },
  },
];
