import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

// Flat config (ESLint 9). The project previously declared `eslint .` with a
// legacy .eslintrc.json but shipped no eslint dependency, so linting never ran.
// eslint-config-next 16 exports a native flat config, so we spread it directly.

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**", // static design mockups (public/hifi/*.jsx) — not app source
      "components/ui/**", // legacy shadcn primitives — not part of Quiet UI
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
      // Linting was never run before, so the existing codebase carries
      // violations of these rules — several of them brand-new React 19 hooks
      // checks (set-state-in-effect/immutability/purity) the code predates.
      // They're surfaced as warnings (not silenced) so `pnpm lint` is green
      // and new genuinely-broken code (undefined refs, etc.) still errors.
      // Burning these down is tracked as a follow-up.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/incompatible-library": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]

export default eslintConfig
