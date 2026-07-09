import path from "node:path";
import { defineConfig } from "vitest/config";

// espelha o alias "@/*" do tsconfig para os testes
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
