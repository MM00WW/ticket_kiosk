import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/**", "**/server/**"],
              allowTypeImports: true,
              message:
                "Client components must access server code through API routes; use import type for shared DTOs.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "dist/**", "src/generated/**", "next-env.d.ts"]),
]);
