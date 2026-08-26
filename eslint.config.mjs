import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // Build output and dependencies are not ours to lint. Without this, `npm run lint` reports
    // hundreds of errors from generated bundles in .next/ and drowns out real findings, which
    // makes the script useless as a pre-commit or CI gate.
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'dist/**', 'coverage/**'],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-console": "error",
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default eslintConfig;
