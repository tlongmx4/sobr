import { defineConfig } from "vitest/config";
import path from "node:path";

// Test runner config. Node environment (no DOM): the suite covers server-side
// logic — scoring helpers, the crisis classifier wrapper, API route handlers,
// and the Prisma schema — none of which need a browser. The `@/` alias mirrors
// tsconfig so imports resolve the same way they do in the app.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
