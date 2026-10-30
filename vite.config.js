import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function buildVersionPlugin() {
  const buildId = Date.now().toString(36);
  return {
    name: "pjd-build-version",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
});
