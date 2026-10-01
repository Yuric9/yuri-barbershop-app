import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // As fotos vêm do R2 (/api/upload) e o logo é pequeno: não usamos o otimizador do next/image.
      "@next/next/no-img-element": "off",
      // Login, logout e sessão expirada recarregam a página inteira de propósito,
      // para descartar todo o estado do painel.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "dist/**", ".scratch/**", "next-env.d.ts", "worker-configuration.d.ts"]),
]);

export default eslintConfig;
